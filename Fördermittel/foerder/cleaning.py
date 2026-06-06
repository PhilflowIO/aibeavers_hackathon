"""HTML cleaning, description section extraction, deterministic UUID (Spec C).

The raw funding dump stores descriptions as HTML with ``<h3>Kurztext</h3>`` /
``<h3>Volltext</h3>`` sections. We split those into a short and a full text,
strip all markup, and never emit an empty string (an empty embedding input
trips a downstream HTTP 422). Program identity is a deterministic uuid5 so
re-ingests of the same record land on the same id.
"""

from __future__ import annotations

import re
import uuid

from bs4 import BeautifulSoup

from foerder.config import NULL_FILL, UUID_NAMESPACE

_WHITESPACE_RE = re.compile(r"\s+")
_KURZTEXT_RE = re.compile(
    r"<h3>\s*Kurztext\s*</h3>(.*?)<h3>\s*Volltext\s*</h3>",
    re.DOTALL | re.IGNORECASE,
)
_VOLLTEXT_RE = re.compile(
    r"<h3>\s*Volltext\s*</h3>(.*)$",
    re.DOTALL | re.IGNORECASE,
)


def clean_html(value: str | None) -> str:
    """Strip HTML markup and collapse whitespace; ``NULL_FILL`` on empty input."""
    if not value:
        return NULL_FILL
    if "<" in value and ">" in value:
        soup = BeautifulSoup(value, "lxml")
        text = soup.get_text(separator=" ")
    else:
        text = value
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text or NULL_FILL


def extract_descriptions(description_html: str | None) -> tuple[str, str]:
    """Split a Kurztext/Volltext HTML blob into ``(short, full)`` clean text.

    Missing sections become ``NULL_FILL``. With no h3 markers at all, returns
    ``(clean_html(whole), NULL_FILL)``. Never returns an empty string and never
    raises.
    """
    if not description_html:
        return NULL_FILL, NULL_FILL

    kurz_match = _KURZTEXT_RE.search(description_html)
    voll_match = _VOLLTEXT_RE.search(description_html)

    if kurz_match is None and voll_match is None:
        return clean_html(description_html), NULL_FILL

    short = clean_html(kurz_match.group(1)) if kurz_match else NULL_FILL
    full = clean_html(voll_match.group(1)) if voll_match else NULL_FILL
    return short, full


def program_uuid(id_hash: str) -> str:
    """Deterministic uuid5 from a record's id-hash; stable across re-ingests."""
    return str(uuid.uuid5(UUID_NAMESPACE, str(id_hash)))
