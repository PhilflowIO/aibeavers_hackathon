"""Gold evaluation set for funding retrieval — real, active programmes.

Each entry pairs a German citizen/applicant *profile* (the free-text query a
user would type) with the distinctive title substrings of the programme(s) we
expect retrieval to surface. Matching is **case-insensitive substring** on a
retrieved programme's ``title`` (robust to exact-uuid drift across re-ingests):
a result counts as the gold hit if ANY ``expected_title_contains`` substring is
contained in its title, OR (when given) its ``uuid`` equals ``expected_uuid``.

All target titles were verified READ-ONLY against ``data/funding_raw.parquet``
(``deleted == false``); the substrings are chosen to be distinctive enough to
match reliably without colliding with unrelated programmes. The full title each
substring is grounded in is named in the trailing comment.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GoldEntry:
    """One (profile, expected) evaluation pair.

    ``expected_title_contains`` substrings are matched case-insensitively against
    retrieved titles. ``filters`` mirrors ``search_funding``'s taxonomy filter
    dict. ``expected_uuid`` is an optional exact-id fallback match.
    """

    query: str
    expected_title_contains: list[str]
    filters: dict[str, list[str]] | None = None
    expected_uuid: str | None = None
    note: str = field(default="")


GOLD_SET: list[GoldEntry] = [
    GoldEntry(
        query=(
            "Ich bin Privatperson und möchte in meinem selbst bewohnten Einfamilienhaus "
            "die alte Gasheizung durch eine Wärmepumpe ersetzen. Welche Förderung gibt es?"
        ),
        expected_title_contains=["Heizungsförderung für Privatpersonen"],
        note="BEG-EM – Heizungsförderung für Privatpersonen – Wohngebäude (bundesweit)",
    ),
    GoldEntry(
        query=(
            "Privater Hauseigentümer in Nordrhein-Westfalen, ich will mein Dach dämmen "
            "und energetisch sanieren. Gibt es ein NRW-Programm dafür?"
        ),
        expected_title_contains=["NRW.BANK.Gebäudesanierung"],
        filters={"funding_location": ["Nordrhein-Westfalen"]},
        note="NRW.BANK.Gebäudesanierung (NRW)",
    ),
    GoldEntry(
        query=(
            "Wärmeschutz und Dämmung im Gebäudebestand in Hamburg — ich möchte mein "
            "Wohngebäude energetisch verbessern."
        ),
        expected_title_contains=["Wärmeschutz im Gebäudebestand"],
        filters={"funding_location": ["Hamburg"]},
        note="Förderung von Wärmeschutz im Gebäudebestand (Hamburg)",
    ),
    GoldEntry(
        query=(
            "Wir wollen in Bayern eine neue ambulant betreute Pflege-WG für ältere "
            "pflegebedürftige Menschen aufbauen. Welche Förderung passt?"
        ),
        expected_title_contains=["ambulant betreuter Wohngemeinschaften", "WoLeRaF"],
        filters={"funding_location": ["Bayern"]},
        note="Förderrichtlinie Pflege – WoLeRaF (Bayern), ambulant betreute WG",
    ),
    GoldEntry(
        query=(
            "Junge Familie, wir wollen erstmals selbstgenutztes Wohneigentum erwerben "
            "und suchen einen bundesweiten KfW-Förderkredit."
        ),
        expected_title_contains=["KfW-Wohneigentumsprogramm"],
        note="KfW-Wohneigentumsprogramm (bundesweit)",
    ),
    GoldEntry(
        query=(
            "Familie mit Kindern, Neubau eines Eigenheims — gibt es eine bundesweite "
            "Förderung speziell für Familien beim Wohneigentum?"
        ),
        expected_title_contains=["Bundesförderung Wohneigentum für Familien"],
        note="Bundesförderung Wohneigentum für Familien – Neubau (bundesweit)",
    ),
    GoldEntry(
        query=(
            "Privatperson in Baden-Württemberg, ich möchte eine Photovoltaikanlage auf "
            "mein privates Wohnhaus setzen."
        ),
        expected_title_contains=["Photovoltaikanlagen privater Wohnhäuser"],
        filters={"funding_location": ["Baden-Württemberg"]},
        note="Förderung für Photovoltaikanlagen privater Wohnhäuser (BW)",
    ),
    GoldEntry(
        query="Solarförderung für Privatpersonen und Unternehmen in Berlin.",
        expected_title_contains=["SolarPLUS"],
        filters={"funding_location": ["Berlin"]},
        note="SolarPLUS (Berlin)",
    ),
    GoldEntry(
        query=(
            "Ich möchte in Sachsen ein Lastenfahrrad bzw. Lastenpedelec anschaffen — "
            "gibt es dafür eine Förderung?"
        ),
        expected_title_contains=["Lastenfahrrädern und Lastenpedelecs", "RL Lastenfahrrad"],
        filters={"funding_location": ["Sachsen"]},
        note="Förderung von Lastenfahrrädern und Lastenpedelecs (RL Lastenfahrrad), Sachsen",
    ),
    GoldEntry(
        query=(
            "Handwerksmeister, ich will mich selbstständig machen und einen Betrieb "
            "gründen. Gibt es in NRW eine Meistergründungsprämie?"
        ),
        expected_title_contains=["Meistergründungsprämie NRW", "Meistergründungsprämie"],
        filters={"funding_location": ["Nordrhein-Westfalen"]},
        note="Meistergründungsprämie NRW",
    ),
    GoldEntry(
        query=(
            "Bundesweites Gründungsstipendium für ein Tech-Startup aus der Hochschule "
            "heraus, Pre-Seed-Phase."
        ),
        expected_title_contains=["EXIST-Gründungsstipendium"],
        note="EXIST-Gründungsstipendium (bundesweit)",
    ),
    GoldEntry(
        query="Gründungsstipendium für eine Existenzgründung in Nordrhein-Westfalen.",
        expected_title_contains=["Gründungsstipendium.NRW"],
        filters={"funding_location": ["Nordrhein-Westfalen"]},
        note="Gründungsstipendium.NRW",
    ),
    GoldEntry(
        query=(
            "Ältere Privatperson, ich möchte mein Bad barrierefrei umbauen und die "
            "Wohnung altersgerecht modernisieren — bundesweiter Zuschuss?"
        ),
        expected_title_contains=["Barrierereduzierung", "Altersgerecht Umbauen"],
        note="Investitionszuschuss Barrierereduzierung – Altersgerecht Umbauen (bundesweit)",
    ),
    GoldEntry(
        query="Altersgerechtes Wohnen in Berlin — Darlehen für barrierefreien Umbau.",
        expected_title_contains=["IBB Altersgerecht Wohnen"],
        filters={"funding_location": ["Berlin"]},
        note="IBB Altersgerecht Wohnen (Berlin)",
    ),
    GoldEntry(
        query=(
            "Energieeffiziente und altersgerechte Modernisierung von Wohnraum in "
            "Sachsen-Anhalt für Privatpersonen."
        ),
        expected_title_contains=["Sachsen-Anhalt MODERN"],
        filters={"funding_location": ["Sachsen-Anhalt"]},
        note="Energieeffiziente/altersgerechte Wohnraummodernisierung (Sachsen-Anhalt MODERN)",
    ),
    GoldEntry(
        query=(
            "Privater Eigentümer eines denkmalgeschützten Hauses in Bayern, ich möchte "
            "es denkmalgerecht sanieren. Gibt es ein Denkmalschutz-Sonderprogramm?"
        ),
        expected_title_contains=["Denkmalschutz-Sonderprogramms"],
        filters={"funding_location": ["Bayern"]},
        note="Förderung im Rahmen des Denkmalschutz-Sonderprogramms (Bayern)",
    ),
    GoldEntry(
        query=(
            "Kommune in Schleswig-Holstein, wir wollen den Breitbandausbau in "
            "ländlichen Räumen fördern lassen."
        ),
        expected_title_contains=[
            "Breitbandversorgung in den ländlichen Räumen",
            "Breitbandrichtlinie",
        ],
        filters={"funding_location": ["Schleswig-Holstein"]},
        note="Breitbandversorgung in den ländlichen Räumen (Breitbandrichtlinie), SH",
    ),
    GoldEntry(
        query=(
            "Unternehmen in Baden-Württemberg, wir wollen Ladeinfrastruktur für "
            "Elektrofahrzeuge auf dem Firmengelände aufbauen."
        ),
        expected_title_contains=["Charge@BW", "Ladeinfrastruktur für Elektrofahrzeuge"],
        filters={"funding_location": ["Baden-Württemberg"]},
        note="Förderung der Ladeinfrastruktur für Elektrofahrzeuge (Charge@BW), BW",
    ),
    GoldEntry(
        query=(
            "Privatperson in Mecklenburg-Vorpommern, ich möchte ein steckerfertiges "
            "Balkonkraftwerk (Mini-PV) anschaffen."
        ),
        expected_title_contains=["steckerfertige Photovoltaikanlagen"],
        filters={"funding_location": ["Mecklenburg-Vorpommern"]},
        note="Zuwendungen für steckerfertige Photovoltaikanlagen für Bürgerinnen und Bürger (MV)",
    ),
    GoldEntry(
        query=(
            "Unternehmen mit Nichtwohngebäude, wir wollen die Heizung über die "
            "Bundesförderung für effiziente Gebäude erneuern."
        ),
        expected_title_contains=["Heizungsförderung für Unternehmen – Nichtwohngebäude"],
        note="BEG – Heizungsförderung für Unternehmen – Nichtwohngebäude (bundesweit)",
    ),
]


def load_gold_set() -> list[GoldEntry]:
    """Return the gold evaluation set (tiny loader for callers/tests)."""
    return GOLD_SET
