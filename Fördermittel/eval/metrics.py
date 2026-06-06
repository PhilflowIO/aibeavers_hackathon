"""Pure ranking-metric functions for the funding-retrieval eval harness.

These operate on *opaque* ranked id lists and a set of relevant ids, so they
are fully testable without any retrieval, network, or token. The live runner
(:mod:`eval.run_eval`) turns ``search_funding`` results into such id lists by
the title-substring / uuid match rule and then calls into here.

Conventions:

* ``ranked_ids`` is ordered best-first (rank 1 is index 0).
* ``relevant_ids`` is the set of ids that count as a correct hit for a query.
* All scores are in ``[0.0, 1.0]``.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence


def hit_at_k(ranked_ids: Sequence[str], relevant_ids: set[str], k: int) -> float:
    """Return ``1.0`` if any relevant id appears in the top-``k``, else ``0.0``.

    ``k`` is clamped to non-negative; ``k == 0`` (or no relevant ids) yields
    ``0.0``. Only the first ``k`` entries of ``ranked_ids`` are inspected.
    """
    if k <= 0 or not relevant_ids:
        return 0.0
    top_k = ranked_ids[:k]
    return 1.0 if any(rid in relevant_ids for rid in top_k) else 0.0


def reciprocal_rank(ranked_ids: Sequence[str], relevant_ids: set[str]) -> float:
    """Return the reciprocal of the 1-based rank of the first relevant id.

    ``1.0`` if a relevant id is at rank 1, ``0.5`` at rank 2, and so on; ``0.0``
    if no relevant id appears anywhere in ``ranked_ids``.
    """
    if not relevant_ids:
        return 0.0
    for index, rid in enumerate(ranked_ids):
        if rid in relevant_ids:
            return 1.0 / (index + 1)
    return 0.0


def aggregate(per_query: Iterable[dict[str, float]]) -> dict[str, float]:
    """Mean-aggregate per-query metric dicts into the headline numbers.

    Each ``per_query`` entry is expected to carry the keys ``hit@1``, ``hit@3``,
    ``hit@5`` and ``rr`` (as produced by :func:`per_query_metrics`). Returns
    ``{"hit@1", "hit@3", "hit@5", "mrr", "n"}``; an empty input yields all-zero
    metrics with ``n == 0`` (never a division-by-zero).
    """
    rows = list(per_query)
    n = len(rows)
    if n == 0:
        return {"hit@1": 0.0, "hit@3": 0.0, "hit@5": 0.0, "mrr": 0.0, "n": 0.0}

    def mean(key: str) -> float:
        return sum(row.get(key, 0.0) for row in rows) / n

    return {
        "hit@1": mean("hit@1"),
        "hit@3": mean("hit@3"),
        "hit@5": mean("hit@5"),
        "mrr": mean("rr"),
        "n": float(n),
    }


def per_query_metrics(ranked_ids: Sequence[str], relevant_ids: set[str]) -> dict[str, float]:
    """Compute the per-query metric dict consumed by :func:`aggregate`.

    Returns ``{"hit@1", "hit@3", "hit@5", "rr"}`` for one query's ranking.
    """
    return {
        "hit@1": hit_at_k(ranked_ids, relevant_ids, 1),
        "hit@3": hit_at_k(ranked_ids, relevant_ids, 3),
        "hit@5": hit_at_k(ranked_ids, relevant_ids, 5),
        "rr": reciprocal_rank(ranked_ids, relevant_ids),
    }
