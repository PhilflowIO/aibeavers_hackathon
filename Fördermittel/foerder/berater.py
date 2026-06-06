"""Fördermittel-Berater — an agent that iteratively drives the MCP tools.

The agent (LangGraph ReAct over Qwen) loads the existing ``foerder`` MCP server
over **stdio** as a subprocess, so only that subprocess touches the embedded
Qdrant + DuckDB — no lock conflict with the host process. It runs a multi-round
funding consultation: profile intake → ``search_funding`` in several rounds
(always filtering ``funding_location`` on the Bundesland AND ``bundesweit`` so
federal programmes like BEG/KfW/BAFA are not lost) → eligibility check via
``get_program`` → a grounded German shortlist.

Run live::

    uv run foerder-berater "Privater Eigentümer in NRW, ..."
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from typing import Any, cast

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.sessions import Connection
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from pydantic import SecretStr

from foerder.config import get_settings

#: German persona / operating instructions for the Berater agent.
BERATER_SYSTEM = """\
Du bist ein erfahrener Fördermittel-Berater für deutsche Förderprogramme. Du
berätst eine Bürgerin oder einen Bürger zu einem konkreten Vorhaben (z.B. eine
energetische Sanierung). Du arbeitest iterativ mit zwei Werkzeugen:

- `search_funding(query, filters, semantic_weight, limit)` — findet passende
  Programme per Freitext-Suche, optional gefiltert nach den Taxonomie-Spalten
  funding_type, funding_area, funding_location, eligible_applicants (je eine
  Liste von Rohwerten).
- `get_program(uuid)` — liefert den vollständigen Datensatz eines Programms
  (echte Konditionen, Antragsweg, Link) anhand der uuid aus den Suchtreffern.

So gehst du vor:

1. PROFIL-INTAKE: Erfasse aus der Eingabe das Vorhaben, die Antragsteller-Rolle
   (z.B. privater Eigentümer, Unternehmen, Kommune), Region/Bundesland, ob es
   sich um Bestand oder Neubau handelt, das Budget und die gewünschte Förderart
   (Zuschuss, Kredit, ...). Was unklar ist, behandelst du als offen — du
   erfindest nichts.

2. SUCHE IN MEHREREN RUNDEN: Rufe `search_funding` mehrfach mit
   unterschiedlichen, gezielten Anfragen auf (z.B. eine Runde pro Teilvorhaben:
   Dämmung, Wärmepumpe, ...). WICHTIG: setze `funding_location` IMMER als
   Bundesland UND "bundesweit" zusammen, z.B.
   filters={"funding_location": ["Nordrhein-Westfalen", "bundesweit"]} —
   sonst fehlen die Bundesprogramme (BEG, KfW, BAFA).

3. EIGNUNG PRÜFEN: Hole für JEDES Programm, das du in der Shortlist nennen
   willst, mit `get_program` den vollen Datensatz und prüfe die Eignung an den
   ECHTEN Konditionen (Antragsteller-Kreis, Region, förderfähige Maßnahmen).
   Nimm die Region ernst. Alle quantitativen Angaben, die du später nennst,
   müssen aus genau diesem Datensatz stammen.

4. SHORTLIST: Gib am Ende eine priorisierte Shortlist der passenden Programme.
   Je Programm: Titel, eine kurze Begründung warum es passt (an den echten
   Konditionen), Hinweise zur Kumulierbarkeit mit anderen Programmen, die
   konkreten nächsten Schritte und den Link (url) zum Programm.

Regeln:
- QUELLENBINDUNG (hart): Programm-Existenz, Titel, Fördersätze, Beträge,
  Prozentwerte, Einkommens-/Förderhöchstgrenzen, Fristen und Bedingungen nennst
  du AUSSCHLIESSLICH, wenn sie wörtlich im Ergebnis von `search_funding` /
  `get_program` stehen. NIEMALS aus deinem Allgemein-/Modellwissen — auch nicht,
  wenn du den „üblichen" Fördersatz zu kennen glaubst.
- KEINE ZAHL OHNE BELEG: Steht eine konkrete Zahl (z.B. Fördersatz, Höchstbetrag,
  Einkommensgrenze) nicht im `get_program`-Datensatz, dann nenne sie NICHT.
  Schreibe stattdessen „(Konditionen siehe verlinktes Original)" oder rufe
  `get_program` erneut/für ein weiteres Programm auf, um den Beleg zu holen.
- Wenn du ein Programm oder eine Angabe nicht über die Werkzeuge belegen kannst,
  lass es weg statt zu raten. Fehlende Felder benennst du offen.
- Antworte auf Deutsch, klar strukturiert.
- Schließe immer mit dem wörtlichen Hinweis:
  „Dies ist eine Orientierung, keine Rechtsberatung."
"""

#: MCP server config — the existing foerder server over stdio as a subprocess.
MCP_SERVERS: dict[str, dict[str, Any]] = {
    "foerder": {
        "command": "uv",
        "args": ["run", "foerder-mcp", "--transport", "stdio"],
        "transport": "stdio",
    }
}


def build_llm() -> ChatOpenAI:
    """Construct the Qwen chat model via the OpenAI-compatible DashScope API."""
    settings = get_settings()
    return ChatOpenAI(
        model=settings.qwen_model,
        base_url=settings.qwen_base_url,
        api_key=SecretStr(settings.qwen_api_key),
        temperature=0,
    )


def build_mcp_client() -> MultiServerMCPClient:
    """Construct the MCP client that launches the foerder server over stdio."""
    return MultiServerMCPClient(cast(dict[str, Connection], MCP_SERVERS))


def _format_tool_call(name: str, args: dict[str, Any]) -> str:
    """One-line, demo-friendly rendering of a tool call."""
    return f"  -> {name}({args})"


async def run_berater(profile: str, *, verbose: bool = True) -> str:
    """Run one consultation round-trip for ``profile`` and return the answer.

    Builds the LLM, opens ONE persistent MCP session (launching the foerder
    server as a single stdio subprocess), runs the ReAct agent to completion,
    and — when ``verbose`` — prints each tool call (name + args) and the final
    answer to stderr for the live demo. The session context manager tears the
    subprocess down, even on error.

    A single shared session is essential here: ``client.get_tools()`` opens a
    *new* session — and thus a new subprocess — per tool call, and the embedded
    Qdrant store can only be held by one process at a time. Several
    ``search_funding`` calls in one agent turn would then race for the storage
    lock. Binding all tools to one ``client.session(...)`` keeps exactly one
    subprocess (one Qdrant client) alive for the whole consultation.
    """
    llm = build_llm()
    client = build_mcp_client()
    async with client.session("foerder") as session:
        tools = await load_mcp_tools(session)
        if verbose:
            names = ", ".join(t.name for t in tools)
            print(f"[berater] {len(tools)} MCP tools geladen: {names}", file=sys.stderr)

        agent = create_react_agent(llm, tools, prompt=BERATER_SYSTEM)
        result = await agent.ainvoke({"messages": [{"role": "user", "content": profile}]})

        messages = result["messages"]
        if verbose:
            for msg in messages:
                for call in getattr(msg, "tool_calls", None) or []:
                    print(
                        _format_tool_call(call["name"], call.get("args", {})),
                        file=sys.stderr,
                    )

        final = messages[-1]
        answer = final.content if isinstance(final.content, str) else str(final.content)
        if verbose:
            print("\n" + "=" * 72, file=sys.stderr)
            print(answer, file=sys.stderr)
        return answer


def main() -> None:
    """``foerder-berater`` entrypoint: one-shot ``profile`` arg, or a stdin REPL."""
    parser = argparse.ArgumentParser(prog="foerder-berater")
    parser.add_argument(
        "profile",
        nargs="?",
        default=None,
        help="Bürger-Profil/Vorhaben als Freitext. Ohne Argument: interaktive REPL.",
    )
    args = parser.parse_args()

    if args.profile is not None:
        answer = asyncio.run(run_berater(args.profile))
        print(answer)
        return

    print("Fördermittel-Berater — Profil eingeben (leer + Enter beendet):", file=sys.stderr)
    for line in sys.stdin:
        profile = line.strip()
        if not profile:
            break
        answer = asyncio.run(run_berater(profile))
        print(answer)


if __name__ == "__main__":
    main()
