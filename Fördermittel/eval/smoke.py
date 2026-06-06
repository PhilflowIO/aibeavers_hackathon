"""Six-profile smoke test for funding retrieval.

Runs ``search_funding`` for a handful of representative citizen profiles and
prints the top-5 titles per profile — a fast eyeball check that retrieval
returns plausible programmes. Same token/index guard as :mod:`eval.run_eval`:
prints a clear setup message and returns (non-fatal) when unavailable.
"""

from __future__ import annotations

from typing import Any

from eval._guard import check_available

#: Representative profiles. The first three are the mandated smoke targets.
SMOKE_PROFILES: list[str] = [
    "Dachdämmung NRW privater Eigentümer",
    "Wärmepumpe Privatperson",
    "Pflege-WG",
    "Familie Wohneigentum Neubau bundesweit",
    "Photovoltaik privates Wohnhaus Baden-Württemberg",
    "Lastenfahrrad Förderung Sachsen",
]

#: How many titles to print per profile.
TOP_N = 5


def _print_results(profile: str, results: list[dict[str, Any]]) -> None:
    """Print the top-``TOP_N`` retrieved titles for one ``profile``."""
    print(f"\n### {profile}")
    if not results:
        print("  (no results)")
        return
    for index, result in enumerate(results[:TOP_N], start=1):
        title = result.get("title", "<no title>")
        score = result.get("score")
        score_str = f"{score:.3f}" if isinstance(score, (int, float)) else "?"
        print(f"  {index}. [{score_str}] {title}")


def main() -> None:
    """Entry point: guard the index, then run the smoke profiles and print top-5."""
    available, reason = check_available()
    if not available:
        print(reason)
        return

    from foerder.mcp_server import FundingService

    service = FundingService()
    print("=== Funding retrieval smoke (top-5 titles per profile) ===")
    for profile in SMOKE_PROFILES:
        results = service.search_funding(profile, limit=TOP_N)
        _print_results(profile, results)


if __name__ == "__main__":
    main()
