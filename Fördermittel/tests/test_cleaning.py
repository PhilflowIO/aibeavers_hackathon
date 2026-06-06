"""Tests for foerder.cleaning (Spec C, cleaning parts)."""

from __future__ import annotations

from foerder.cleaning import clean_html, extract_descriptions, program_uuid
from foerder.config import NULL_FILL

_SAMPLE = (
    "<h3>Kurztext</h3>"
    "<p>Kurze <b>Förderung</b> für KMU.</p>"
    "<h3>Volltext</h3>"
    "<p>Ausführliche Beschreibung mit  mehreren   Sätzen.</p>"
)


def test_clean_html_strips_tags() -> None:
    assert clean_html("<p>Hallo <b>Welt</b></p>") == "Hallo Welt"


def test_clean_html_collapses_whitespace() -> None:
    assert clean_html("<p>a    b\n\tc</p>") == "a b c"


def test_clean_html_plain_text_just_strips() -> None:
    assert clean_html("  plain text  ") == "plain text"


def test_clean_html_null_fill_on_empty() -> None:
    assert clean_html(None) == NULL_FILL
    assert clean_html("") == NULL_FILL
    assert clean_html("   ") == NULL_FILL


def test_extract_descriptions_pulls_short_and_full() -> None:
    short, full = extract_descriptions(_SAMPLE)
    assert short == "Kurze Förderung für KMU."
    assert full == "Ausführliche Beschreibung mit mehreren Sätzen."


def test_extract_descriptions_missing_volltext_falls_back_to_whole() -> None:
    # No Volltext marker -> Kurztext regex (which needs a trailing Volltext) and
    # Volltext regex both miss -> best-effort whole-text fallback per spec.
    short, full = extract_descriptions("<h3>Kurztext</h3><p>Nur kurz.</p>")
    assert short == "Kurztext Nur kurz."
    assert full == NULL_FILL


def test_extract_descriptions_missing_kurztext() -> None:
    # Volltext marker present -> Volltext captures, Kurztext section is N/A.
    short, full = extract_descriptions("<h3>Volltext</h3><p>Nur lang.</p>")
    assert short == NULL_FILL
    assert full == "Nur lang."


def test_extract_descriptions_no_markers_best_effort() -> None:
    short, full = extract_descriptions("<p>Irgendein Text ohne Sektionen.</p>")
    assert short == "Irgendein Text ohne Sektionen."
    assert full == NULL_FILL


def test_extract_descriptions_never_empty() -> None:
    short, full = extract_descriptions(None)
    assert (short, full) == (NULL_FILL, NULL_FILL)
    # Empty section bodies must not yield "".
    short2, full2 = extract_descriptions("<h3>Kurztext</h3><h3>Volltext</h3>")
    assert short2 == NULL_FILL
    assert full2 == NULL_FILL


def test_program_uuid_deterministic_and_stable() -> None:
    assert program_uuid("abc123") == program_uuid("abc123")


def test_program_uuid_differs_for_different_input() -> None:
    assert program_uuid("abc123") != program_uuid("def456")
