# Webdesigner-Agent für Claude Code

Ein Subagent für Claude Code, der visuell herausragende, produktionsreife
Frontends baut. Kommt mit 15 Design-Skills (u.a. einer Bibliothek aus 36 fertigen
Design-Stilen: Bauhaus, Swiss, Neo-Brutalism, Luxury, Cyberpunk, …) und zwei
MCP-Servern.

## Was drin ist

```
.claude/
  agents/
    webdesigner.md       ← die Agent-Definition
  skills/
    frontend-design/     ← Kern: distinktive, produktionsreife UIs
    design-style/        ← 36 fertige Design-Stile (der große Schatz)
    modern-css/          ← modernes, sauberes CSS
    premium-frontend-ui/ ← immersive, performante Web-Experiences
    polish/ harden/      ← die zwei Pflicht-Checks vor dem Commit
    typeset/ colorize/ animate/ arrange/ critique/
    bolder/ adapt/ delight/ clarify/   ← Design-Verfeinerung
```

## Nutzung

Dieser Ordner liegt im Repo-Root unter `.claude/`. Sobald du Claude Code in
diesem Repo startest, ist der Agent automatisch da — direkt ansteuerbar mit:

> `@webdesigner bau mir eine Hero-Section für …`

Kein Setup, kein Kopieren. Wer das Repo klont, hat den Agent sofort.

**Optional — global für alle deine Projekte verfügbar machen:**
```bash
cp -r .claude/agents/*  ~/.claude/agents/
cp -r .claude/skills/*  ~/.claude/skills/
```

## MCP-Server (optional, aber empfohlen)

Der Agent referenziert zwei MCP-Server. Ohne sie läuft er trotzdem — er kann
dann nur keine Screenshots machen / keine Live-Docs ziehen.

In `~/.claude/settings.json` (oder `.claude/settings.json` im Projekt) unter
`mcpServers` ergänzen:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "Ref": {
      "command": "npx",
      "args": ["-y", "ref-tools-mcp@latest"],
      "env": { "REF_API_KEY": "DEIN_KEY" }
    }
  }
}
```

- **playwright** — lokale Screenshots & Browser-Checks. Kein API-Key, nur `npx`.
  Beim ersten Lauf zieht Playwright einen Browser (`npx playwright install chromium`).
- **Ref** — aktuelle Library-/Framework-Docs. Braucht einen eigenen API-Key
  (https://ref.tools). **Ist optional** — kannst du auch weglassen, dann nimm
  `Ref` aus der `mcpServers`-Liste oben in `webdesigner.md` raus.

## Modell

Die Agent-Definition setzt `model: opus`. Falls du auf einem günstigeren Tier
arbeiten willst, ändere die Zeile in `webdesigner.md` auf `model: sonnet`.

## Was bewusst NICHT drin ist

Aus der internen Version entfernt, weil philflow-spezifisch oder Setup-Overhead:
`craft-cms` (SSH-Zugang zu einem privaten Server), `exa` & `crawl4ai`
(eigene API-Keys / Docker), und der `overdrive`-Skill (Shader/Extrem-Implementierungen,
für eine Demo Overkill).
