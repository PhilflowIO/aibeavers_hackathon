"""DuckDB-backed detail store over the cleaned funding parquet (Spec F).

The Phase-3 MCP server reads full programme records here by ``uuid``. The store
is deliberately **schema-agnostic**: it does ``SELECT *`` and returns whatever
columns the cleaned parquet happens to carry, so it never breaks when ingest
adds or removes a column. The only hard contract is that a ``uuid`` column
exists.

Reads are lazy per call against ``read_parquet(...)`` — the parquet may not
exist until ingest has run, so ``exists()``/``count()`` must not crash on a
missing file and ``get_program`` returns ``None`` (rather than raising) when
the file is absent.
"""

from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import Any

import duckdb

from foerder.config import get_settings


def _jsonable(value: Any) -> Any:
    """Coerce a DuckDB cell into a JSON-serializable Python value.

    DuckDB LIST/ARRAY columns already arrive as Python lists, but their
    elements (and STRUCT/MAP values) may themselves be non-serializable
    (e.g. nested timestamps), so we recurse. TIMESTAMP/DATE/TIME values become
    ISO strings; anything else exotic falls back to ``str()``.
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (_dt.datetime, _dt.date, _dt.time)):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    return str(value)


class DetailStore:
    """Read-only detail lookup over the cleaned funding parquet."""

    def __init__(self, parquet_path: Path | str | None = None) -> None:
        if parquet_path is None:
            parquet_path = get_settings().clean_parquet
        self._path: Path = Path(parquet_path)

    def exists(self) -> bool:
        """Whether the backing parquet file is present on disk."""
        return self._path.is_file()

    def count(self) -> int:
        """Number of rows in the parquet, or ``0`` if the file is absent."""
        if not self.exists():
            return 0
        with duckdb.connect() as con:
            row = con.execute(
                "SELECT count(*) FROM read_parquet(?)", [str(self._path)]
            ).fetchone()
        return int(row[0]) if row is not None else 0

    def get_program(self, uuid: str) -> dict[str, Any] | None:
        """Return the full record for ``uuid`` as a JSON-serializable dict.

        Returns ``None`` if the parquet is absent or no row matches. List/array
        columns come back as Python lists; timestamps as ISO strings.
        """
        if not self.exists():
            return None
        with duckdb.connect() as con:
            cur = con.execute(
                "SELECT * FROM read_parquet(?) WHERE uuid = ?",
                [str(self._path), uuid],
            )
            row = cur.fetchone()
            if row is None:
                return None
            columns = [desc[0] for desc in cur.description]
        return {col: _jsonable(val) for col, val in zip(columns, row, strict=True)}
