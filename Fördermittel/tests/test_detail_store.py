"""Tests for foerder.detail_store (Spec F, DuckDB detail store)."""

from __future__ import annotations

import datetime as _dt
import json
from pathlib import Path

import polars as pl
import pytest

from foerder.detail_store import DetailStore

_TS = _dt.datetime(2026, 6, 6, 10, 49, 0)


@pytest.fixture
def fixture_parquet(tmp_path: Path) -> Path:
    """A tiny cleaned-parquet fixture: uuid, title, a list col, a timestamp."""
    df = pl.DataFrame(
        {
            "uuid": ["uuid-a", "uuid-b", "uuid-c"],
            "title": ["Programm A", "Programm B", "Programm C"],
            "further_links": [
                ["https://a.example/1", "https://a.example/2"],
                [],
                ["https://c.example/1"],
            ],
            "last_updated": [_TS, _TS, _TS],
        }
    )
    path = tmp_path / "funding_clean.parquet"
    df.write_parquet(path)
    return path


def test_get_program_returns_jsonable_dict(fixture_parquet: Path) -> None:
    store = DetailStore(fixture_parquet)
    result = store.get_program("uuid-a")

    assert result is not None
    assert result["title"] == "Programm A"

    # list column round-trips as a python list
    assert result["further_links"] == ["https://a.example/1", "https://a.example/2"]
    assert isinstance(result["further_links"], list)

    # timestamp came back as a string, not a datetime
    assert isinstance(result["last_updated"], str)

    # the whole dict is JSON-serializable (the MCP layer returns it as JSON)
    dumped = json.loads(json.dumps(result))
    assert dumped["title"] == "Programm A"


def test_get_program_unknown_uuid_returns_none(fixture_parquet: Path) -> None:
    store = DetailStore(fixture_parquet)
    assert store.get_program("does-not-exist") is None


def test_count_matches_fixture_rows(fixture_parquet: Path) -> None:
    store = DetailStore(fixture_parquet)
    assert store.count() == 3


def test_exists_true_for_fixture(fixture_parquet: Path) -> None:
    store = DetailStore(fixture_parquet)
    assert store.exists() is True


def test_missing_path_does_not_crash(tmp_path: Path) -> None:
    store = DetailStore(tmp_path / "nope.parquet")
    assert store.exists() is False
    assert store.count() == 0
    assert store.get_program("uuid-a") is None
