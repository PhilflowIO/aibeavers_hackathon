"""Unit tests for the pure ranking metrics (eval.metrics). No network.

Exercises hit@k boundaries, reciprocal-rank for rank 1 / 2 / none, and the
aggregate over several synthetic queries — all on opaque ranked id lists, so
no retrieval, token, or Qdrant is involved.
"""

from __future__ import annotations

from eval.metrics import aggregate, hit_at_k, per_query_metrics, reciprocal_rank

RANKED = ["a", "b", "c", "d", "e"]


# -- hit_at_k --------------------------------------------------------------


def test_hit_at_k_relevant_at_rank_1() -> None:
    assert hit_at_k(RANKED, {"a"}, 1) == 1.0
    assert hit_at_k(RANKED, {"a"}, 3) == 1.0


def test_hit_at_k_boundary_inside_and_outside_k() -> None:
    # "c" is at rank 3 (index 2): inside k=3, outside k=2.
    assert hit_at_k(RANKED, {"c"}, 3) == 1.0
    assert hit_at_k(RANKED, {"c"}, 2) == 0.0


def test_hit_at_k_no_relevant_in_top_k() -> None:
    assert hit_at_k(RANKED, {"e"}, 3) == 0.0
    assert hit_at_k(RANKED, {"z"}, 5) == 0.0


def test_hit_at_k_any_relevant_counts() -> None:
    assert hit_at_k(RANKED, {"d", "b"}, 3) == 1.0  # "b" at rank 2 qualifies


def test_hit_at_k_zero_k_and_empty_relevant() -> None:
    assert hit_at_k(RANKED, {"a"}, 0) == 0.0
    assert hit_at_k(RANKED, set(), 5) == 0.0


# -- reciprocal_rank -------------------------------------------------------


def test_reciprocal_rank_first_position() -> None:
    assert reciprocal_rank(RANKED, {"a"}) == 1.0


def test_reciprocal_rank_second_position() -> None:
    assert reciprocal_rank(RANKED, {"b"}) == 0.5


def test_reciprocal_rank_uses_first_relevant() -> None:
    # "c" (rank 3) and "e" (rank 5) both relevant -> RR from the earlier one.
    assert reciprocal_rank(RANKED, {"c", "e"}) == 1.0 / 3


def test_reciprocal_rank_none_relevant() -> None:
    assert reciprocal_rank(RANKED, {"z"}) == 0.0
    assert reciprocal_rank(RANKED, set()) == 0.0


# -- per_query_metrics -----------------------------------------------------


def test_per_query_metrics_shape_and_values() -> None:
    metrics = per_query_metrics(RANKED, {"b"})
    assert metrics == {"hit@1": 0.0, "hit@3": 1.0, "hit@5": 1.0, "rr": 0.5}


# -- aggregate -------------------------------------------------------------


def test_aggregate_over_several_queries() -> None:
    rows = [
        per_query_metrics(RANKED, {"a"}),  # hit@1=1, rr=1.0
        per_query_metrics(RANKED, {"b"}),  # hit@1=0, hit@3=1, rr=0.5
        per_query_metrics(RANKED, {"z"}),  # all miss, rr=0
    ]
    agg = aggregate(rows)
    assert agg["n"] == 3.0
    assert agg["hit@1"] == 1.0 / 3
    assert agg["hit@3"] == 2.0 / 3
    assert agg["hit@5"] == 2.0 / 3
    assert abs(agg["mrr"] - (1.0 + 0.5 + 0.0) / 3) < 1e-9


def test_aggregate_empty_is_all_zero() -> None:
    agg = aggregate([])
    assert agg == {"hit@1": 0.0, "hit@3": 0.0, "hit@5": 0.0, "mrr": 0.0, "n": 0.0}


def test_aggregate_perfect_and_total_miss() -> None:
    perfect = aggregate([per_query_metrics(RANKED, {"a"}) for _ in range(4)])
    assert perfect["hit@1"] == 1.0
    assert perfect["mrr"] == 1.0

    miss = aggregate([per_query_metrics(RANKED, {"z"}) for _ in range(4)])
    assert miss["hit@5"] == 0.0
    assert miss["mrr"] == 0.0
