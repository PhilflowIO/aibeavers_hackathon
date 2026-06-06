"""Live evaluation runner for the funding-retrieval backend.

Runs the gold set (:mod:`eval.gold_set`) through ``FundingService.search_funding``
and reports Hit@1 / Hit@3 / Hit@5 / MRR plus a per-query table. Matching uses
the title-substring / uuid rule from the gold set — a retrieved programme counts
as the gold hit if any ``expected_title_contains`` substring is in its title
(case-insensitive) or its ``uuid`` matches ``expected_uuid``.

Requires a populated index: when ``DEEPINFRA_TOKEN`` is empty OR the Qdrant
collection is empty, it prints a clear setup message and exits non-fatally
(``return``, no raise). ``--ingest-first`` runs a (limited) ingest first.
"""

from __future__ import annotations

import argparse
from typing import Any

from eval._guard import check_available
from eval.gold_set import GoldEntry, load_gold_set
from eval.metrics import aggregate, per_query_metrics

#: Retrieval depth per query. Hit@5 needs at least 5; 10 gives MRR room.
DEFAULT_LIMIT = 10


def _is_hit(result: dict[str, Any], entry: GoldEntry) -> bool:
    """Return whether a single retrieved ``result`` satisfies ``entry``'s gold rule."""
    if entry.expected_uuid is not None and result.get("uuid") == entry.expected_uuid:
        return True
    title = str(result.get("title", "")).lower()
    return any(sub.lower() in title for sub in entry.expected_title_contains)


def _ranked_relevant_ids(
    results: list[dict[str, Any]], entry: GoldEntry
) -> tuple[list[str], set[str]]:
    """Turn raw results into a ``(ranked_ids, relevant_ids)`` pair for the metrics.

    Each result contributes its rank position (1-based index) as an opaque id;
    the ids of results matching the gold rule form ``relevant_ids``. Using the
    positional id keeps the metric functions agnostic of uuid drift while still
    honouring the retrieval order.
    """
    ranked_ids: list[str] = []
    relevant_ids: set[str] = set()
    for index, result in enumerate(results):
        rid = f"rank{index}"
        ranked_ids.append(rid)
        if _is_hit(result, entry):
            relevant_ids.add(rid)
    return ranked_ids, relevant_ids


def _hit_rank(results: list[dict[str, Any]], entry: GoldEntry) -> int | None:
    """Return the 1-based rank of the first matching result, or ``None``."""
    for index, result in enumerate(results):
        if _is_hit(result, entry):
            return index + 1
    return None


def _run_ingest_first(limit: int | None) -> None:
    """Run a (optionally limited) ingest to populate the index before evaluating."""
    from foerder.chunking import Chunker
    from foerder.embedding import get_provider
    from foerder.ingest import run_ingest
    from foerder.qdrant_store import QdrantStore
    from foerder.sparse import GermanSparseEncoder

    summary = run_ingest(
        provider=get_provider(),
        store=QdrantStore(),
        encoder=GermanSparseEncoder(),
        chunker=Chunker(),
        limit=limit,
    )
    print(
        f"ingest complete: {summary['programs']} programs, "
        f"{summary['points']} points -> {summary['collection']!r}\n"
    )


def _print_report(rows: list[dict[str, Any]], agg: dict[str, float]) -> None:
    """Print the headline metrics and the per-query hit/rank table."""
    print("\n=== Funding retrieval eval ===")
    print(f"queries evaluated : {int(agg['n'])}")
    print(f"Hit@1             : {agg['hit@1']:.3f}")
    print(f"Hit@3             : {agg['hit@3']:.3f}")
    print(f"Hit@5             : {agg['hit@5']:.3f}")
    print(f"MRR               : {agg['mrr']:.3f}")

    print("\n--- per query ---")
    for row in rows:
        rank = row["hit_rank"]
        rank_str = f"#{rank}" if rank is not None else "miss"
        print(f"  [{rank_str:>4}] rr={row['rr']:.3f}  {row['query'][:72]}")


def main(argv: list[str] | None = None) -> None:
    """Entry point: guard the index, then evaluate the gold set and report."""
    parser = argparse.ArgumentParser(prog="eval.run_eval")
    parser.add_argument(
        "--ingest-first",
        action="store_true",
        help="Run a foerder ingest (respecting --ingest-limit) before evaluating.",
    )
    parser.add_argument(
        "--ingest-limit",
        type=int,
        default=None,
        help="Limit the --ingest-first ingest to the first N raw rows.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Retrieval depth per query (default: {DEFAULT_LIMIT}).",
    )
    args = parser.parse_args(argv)

    if args.ingest_first:
        available, reason = check_available()
        # For ingest we only strictly need the token; an empty index is the
        # whole point of --ingest-first, so only block on a missing token.
        from foerder.config import get_settings

        if not get_settings().deepinfra_token:
            print(reason)
            return
        _run_ingest_first(args.ingest_limit)

    available, reason = check_available()
    if not available:
        print(reason)
        return

    # Imported lazily so the module imports without a token / network.
    from foerder.mcp_server import FundingService

    service = FundingService()
    gold = load_gold_set()

    rows: list[dict[str, Any]] = []
    per_query: list[dict[str, float]] = []
    for entry in gold:
        results = service.search_funding(entry.query, entry.filters, limit=args.limit)
        ranked_ids, relevant_ids = _ranked_relevant_ids(results, entry)
        metrics = per_query_metrics(ranked_ids, relevant_ids)
        per_query.append(metrics)
        rows.append(
            {
                "query": entry.query,
                "rr": metrics["rr"],
                "hit_rank": _hit_rank(results, entry),
            }
        )

    _print_report(rows, aggregate(per_query))


if __name__ == "__main__":
    main()
