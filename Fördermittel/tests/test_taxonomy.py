"""Tests for foerder.taxonomy (Spec B)."""

from __future__ import annotations

from foerder.taxonomy import (
    build_contract,
    canonicalize,
    is_invalid_taxonomy_value,
    normalize_key,
    score_display,
    to_display,
    to_keys,
)


def test_normalize_key_umlauts_and_ampersand() -> None:
    assert normalize_key("Förderung & Entwicklung") == "foerderung_entwicklung"


def test_normalize_key_hyphen() -> None:
    assert normalize_key("Schleswig-Holstein") == "schleswig_holstein"


def test_normalize_key_none_and_blank() -> None:
    assert normalize_key(None) == ""
    assert normalize_key("   ") == ""


def test_normalize_key_strips_punctuation_and_edge_underscores() -> None:
    assert normalize_key("  _Bayern!_  ") == "bayern"
    assert normalize_key("KMU / Großunternehmen") == "kmu_grossunternehmen"


def test_normalize_key_slash_and_combining_marks() -> None:
    # NFKD + combining-mark drop folds accented latin too.
    assert normalize_key("Café") == "cafe"


def test_is_invalid_catches_empty_key() -> None:
    assert is_invalid_taxonomy_value("???", normalize_key("???")) is True


def test_is_invalid_catches_invalid_values() -> None:
    assert is_invalid_taxonomy_value("none", normalize_key("none")) is True
    assert is_invalid_taxonomy_value("NULL", normalize_key("NULL")) is True
    assert is_invalid_taxonomy_value("", normalize_key("")) is True


def test_is_invalid_catches_short_keys() -> None:
    # "EU" -> key "eu" (len 2) is dropped; "Bund" -> "bund" kept.
    assert is_invalid_taxonomy_value("EU", normalize_key("EU")) is True
    assert is_invalid_taxonomy_value("Bund", normalize_key("Bund")) is False


def test_score_display_prefers_mixed_case_spaced() -> None:
    assert score_display("Schleswig Holstein") > score_display("schleswig_holstein")
    assert score_display(None) == -1


def test_build_contract_picks_best_alias() -> None:
    # Both raw strings normalize to the same key.
    raw = ["wohnungsbau_modernisierung", "Wohnungsbau & Modernisierung"]
    key = normalize_key(raw[0])
    assert key == normalize_key(raw[1]) == "wohnungsbau_modernisierung"
    contract = build_contract(raw)
    assert contract[key] == "Wohnungsbau & Modernisierung"


def test_build_contract_drops_invalid() -> None:
    contract = build_contract(["none", "", "EU", "Bayern"])
    assert contract == {"bayern": "Bayern"}


def test_to_keys_dedupes_and_drops_invalid() -> None:
    values = ["Bayern", "bayern", "none", "EU", None, "Baden Württemberg"]
    assert to_keys(values) == ["bayern", "baden_wuerttemberg"]
    assert to_keys(None) == []


def test_to_display_maps_via_contract_with_fallback() -> None:
    contract = build_contract(["Wohnungsbau & Modernisierung", "Bayern"])
    # "Unbekannt" has no contract entry -> falls back to the original value.
    displays = to_display(["wohnungsbau_modernisierung", "Unbekannt"], contract)
    assert displays == ["Wohnungsbau & Modernisierung", "Unbekannt"]


def test_canonicalize_returns_displays_and_keys() -> None:
    contract = build_contract(["Schleswig-Holstein", "Bayern"])
    displays, keys = canonicalize(["schleswig_holstein", "Bayern"], contract)
    assert displays == ["Schleswig-Holstein", "Bayern"]
    assert keys == ["schleswig_holstein", "bayern"]
