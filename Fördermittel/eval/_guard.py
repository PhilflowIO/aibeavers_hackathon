"""Shared availability guard for the live eval runners.

Both :mod:`eval.run_eval` and :mod:`eval.smoke` require two things to produce
real numbers: a ``DEEPINFRA_TOKEN`` (so the dense embedding provider can call
the API) and a *populated* Qdrant collection. This module centralises the check
so both runners degrade with the same clear, non-fatal message.
"""

from __future__ import annotations

from foerder.config import get_settings

SETUP_HINT = "set DEEPINFRA_TOKEN and run foerder-ingest first"


def index_point_count() -> int:
    """Best-effort count of points in the configured Qdrant collection.

    Returns ``0`` if the collection does not exist or the store cannot be
    reached — both mean "nothing to evaluate", which the caller treats as the
    graceful-skip condition.
    """
    from foerder.qdrant_store import QdrantStore

    try:
        return QdrantStore().count()
    except Exception:
        return 0


def check_available() -> tuple[bool, str]:
    """Return ``(available, reason)`` for whether a live eval can run.

    ``available`` is ``True`` only when a non-empty ``DEEPINFRA_TOKEN`` is set
    AND the Qdrant collection holds at least one point. ``reason`` is an empty
    string when available, else a human-readable explanation ending with
    :data:`SETUP_HINT`.
    """
    settings = get_settings()
    if not settings.deepinfra_token:
        return False, f"DEEPINFRA_TOKEN is not set — {SETUP_HINT}."

    count = index_point_count()
    if count == 0:
        return (
            False,
            f"Qdrant collection '{settings.collection_name}' is empty — {SETUP_HINT}.",
        )
    return True, ""
