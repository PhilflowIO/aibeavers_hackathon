# Beratungsprotokoll-Vorlage + Demo-Transkripte (Hackathon 06.06.)

Bau-Empfehlung: **die zwei Pflichtfeld-Tabellen 1:1 als JSON-Schema nehmen.** Der Agent extrahiert pro Feld aus dem Transkript **und markiert fehlende Pflichtfelder als Lücke** — *das ist der Compliance-USP (Demo-Beat 2).* Die zwei Dialog-Gerüste (unten) sind so gebaut, dass jedes Pflichtfeld mindestens einmal vorkommt.

---

## A1 — Versicherungs-Beratungsdokumentation (§ 61/62 VVG, § 34d GewO, IDD)

Pflicht: klar/verständlich, **Textform, VOR Vertragsschluss**. Aufwand ∝ Produktkomplexität + Beitragshöhe.

| Feld (Schema) | Rechtsgrund | Pflicht |
|---|---|---|
| `vermittler_status` (Makler/Mehrfachagent/gebunden + Reg.-Nr.) | § 15 VersVermV | ja |
| `beratungsanlass` | Muster | ja |
| `kundenwuensche` (geäußerte Wünsche) | § 61 Abs.1 S.1 VVG | **ja** |
| `kundenbeduerfnisse` (objektiver Bedarf / Risikosituation) | § 61 Abs.1 S.1 VVG | **ja** |
| `kundenangaben` (Alter, Familienstand, Einkommen, Vorverträge, Gesundheit) | Bedarfsermittlung | ja |
| `erteilter_rat` (konkrete Empfehlung) | § 61 Abs.1 S.1 VVG | **ja** |
| `begruendung_des_rats` (**Gründe je Rat**) | § 61 Abs.1 S.1 VVG | **ja — Kernfeld** |
| `hinweise` (Risiken, Obliegenheiten, Ausschlüsse) | § 61 / Rspr. | ja |
| `kundenentscheidung` | Standard in Mustern (nicht zwingend § 61) | optional |
| `verzichtserklaerung` (gesondert, unterschrieben, Nachteilshinweis) | § 61 Abs.2 VVG | nur bei Verzicht |
| `ort_datum_unterschriften` + Aushändigungsnachweis | § 62 VVG | ja |

**Muster-Links:** IHK-Muster-Beratungsprotokoll (`ihk.de/.../muster-beratungsprotokoll-data.pdf`) · concret (`concret.de/wp-content/uploads/2019/01/Beratungsprotokoll.pdf`) · Arbeitskreis Beratungsprozesse (`beratungsprozesse.de/downloads/`) · Verbraucherzentrale NRW Fragebogen.

---

## A2 — Investment-Geeignetheitserklärung (§ 34f GewO / FinVermV § 18 + § 16; Banken: WpHG § 64 Abs.4)

Zwei Regime: **§34f-Vermittler → FinVermV §18** (Geeignetheitserklärung, ersetzt das alte Protokoll). **Banken/WP-Institute → WpHG §64** + MaComp BT 7.

| Feld (Schema) | Rechtsgrund | Pflicht |
|---|---|---|
| `kenntnisse_erfahrungen` (Anlageklassen, bisherige Geschäfte, Beruf) | § 16 FinVermV / § 64 WpHG | ja |
| `finanzielle_verhaeltnisse` (Einkommen, Verpflichtungen, Vermögen) | § 16 FinVermV | ja |
| `verlusttragfaehigkeit` | § 16 / § 64 | ja |
| `anlageziele` (Zweck, **Horizont**) | § 16 FinVermV | ja |
| `risikotoleranz` | § 16 FinVermV | ja |
| `nachhaltigkeitspraeferenz` (ESG: SFDR Art.8/9, Taxonomie, PAI) | s. ESG-Hinweis | **ja** |
| `empfohlene_anlage` | § 18 FinVermV | ja |
| `begruendung_geeignetheit` (**wie Empfehlung auf Präferenzen/Ziele abgestimmt**) | § 18 FinVermV / § 64 | **ja — Kernfeld** |
| `form_zeitpunkt` (dauerhafter Datenträger, VOR Abschluss) | § 18 FinVermV | ja |

**Muster-Links:** BaFin MaComp BT 7 (`bafin.de/.../dl_rs_0518_MaComp_anlage_bt_7_1.pdf`) · BMWK Muster-VwV FinVermV · IHK-Bonn Informationspflichten FAV.

### ⚠️ ESG-Stichtag — Präzision für Beat 2 (oft falsch zitiert)
- **Banken/WpHG + Versicherungsanlageprodukte (§34d):** ESG-Abfragepflicht **seit 02.08.2022**.
- **§34f-Finanzanlagenvermittler (FinVermV):** erst **seit 20.04.2023** (statische → dynamische EU-Verweisung). Davor offiziell ausgenommen.
- **Demo-Konsequenz:** Modellieren wir einen Versicherungs-/§34d-Berater → ESG seit 2022. Den korrekten Stichtag im Pitch zu nennen = Compliance-Credibility.

---

## B — Demo-Transkript-Gerüste (bau-fertig)

Keine freien Echt-Transkripte (DSGVO). Synthese-Pfad: IHK-Fallvorgabe als Rahmen + Verbraucherzentrale-Beratungsbogen für Kundenfakten + echte Fachbegriffe/Gesundheitsfragen. Ziel: 60–80 Sprecher-Turns, ~12–18 min, jedes Pflichtfeld kommt vor.

### Szenario 1 — Altersvorsorge / Riester
1. Anlass → „Rentenlücke schließen" (`beratungsanlass`)
2. Bestandsaufnahme → Alter, Familienstand, Kinder (Zulagen!), Brutto/Netto, gesetzl. Anwartschaft, Bestandsverträge (`kundenangaben`, `finanzielle_verhaeltnisse`)
3. Wünsche → garantierte Rente vs. Renditechance, Förderung mitnehmen (`kundenwuensche`, `anlageziele`)
4. Risikobereitschaft → sicher / ausgewogen / chancenorientiert (`risikotoleranz`)
5. **★ ESG-Beat** → „Sollen Ihre Beiträge ausschließlich in nachhaltige Fonds (Art. 8/9 SFDR) fließen? Taxonomie-Konformität / PAI-Ausschluss?" (`nachhaltigkeitspraeferenz`)
6. Empfehlung + Begründung → fondsgebundene Riester-Rente, weil Zulagen + Sonderausgabenabzug (§10a EStG) + 2 Kinderzulagen den Effektivbeitrag senken (`erteilter_rat`, `begruendung_des_rats`)
7. **★ Cross-Sell-Anker** → Kunde: „Wir wollen in 2 Jahren ein Haus kaufen." → Wohn-Riester / Baufinanzierung / Risikoleben offen (`hinweise`)
8. Hinweise + nächste Schritte + Aushändigung
*Fachbegriffe:* Rentenlücke, Grund-/Kinderzulage, Sonderausgabenabzug §10a EStG, Zillmerung, Garantieverzinsung, Wohn-Riester, nachgelagerte Besteuerung, fondsgebunden, SFDR Art. 8/9.

### Szenario 2 — Berufsunfähigkeit (BU)
1. Anlass → „Arbeitskraft absichern" (`beratungsanlass`)
2. Beruf → genaue Tätigkeit, Bürotätigkeitsanteil, Berufsgruppe (`kundenangaben`)
3. Bedarfshöhe → Netto, Fixkosten, Versorgungslücke → BU-Rente 60–80 % Netto (`kundenbeduerfnisse`, `finanzielle_verhaeltnisse`)
4. **★ Gesundheitsfragen/Ausschlüsse** → Vorerkrankungen 5/10 J., Psychotherapie, Medikamente, OPs → anonyme Risikovoranfrage → Normalannahme / Risikozuschlag / Leistungsausschluss (`hinweise`, `kundenangaben`)
5. Empfehlung + Begründung → selbstständige BU, Verzicht auf abstrakte Verweisung, Nachversicherungsgarantie, weil Beruf X-eingestuft + Familienverantwortung (`erteilter_rat`, `begruendung_des_rats`)
6. **★ Cross-Sell-Anker** → „Wir erwarten ein Kind." → Nachversicherungsgarantie ohne neue Gesundheitsprüfung, Risikoleben, Dread-Disease (`hinweise`)
7. Verzicht/Hinweis-Block + Doku-Übergabe
*Fachbegriffe:* BU-Grad (50 %), abstrakte/konkrete Verweisung, Nachversicherungsgarantie, Risikovoranfrage, Leistungsausschluss, Risikozuschlag, vorvertragl. Anzeigepflicht §19 VVG, Prognosezeitraum (6 Mon.), Karenzzeit, Dynamik.

---

## Quellen (Auszug)
§61/62 VVG (gesetze-im-internet.de) · §16/§18 FinVermV · §64 WpHG · BaFin MaComp BT 7 · IHK Fallvorgaben Finanzanlagenvermittler (ihk-muenchen.de) · IHK Leitfaden Kaufmann Versicherungen/Finanzen · Verbraucherzentrale NRW Beratungsbogen GA-PAV · doc-bu.de / transparent-beraten.de (BU-Gesundheitsfragen) · BDO/fondsprofessionell (ESG-Stichtag 34f 20.04.2023).
