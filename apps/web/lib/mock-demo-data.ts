import type { AnalyseResult, QaResult } from "./types";

/** Mock analysis output for Thomas Berger / Riester demo (Termin 1). */
export const MOCK_ANALYSE: AnalyseResult = {
  protokoll: {
    beratungsanlass: {
      wert: "Renteninformation erhalten, Altersvorsorge-Lücke schließen",
      belege: [{ meeting_id: "berger-1", start_sec: 9 }],
    },
    kundenangaben: {
      wert: "34 J., verheiratet, 2 Kinder (4 + 7), Angestellter Maschinenbau, unbefristet",
      belege: [{ meeting_id: "berger-1", start_sec: 29 }],
    },
    finanzielle_verhaeltnisse: {
      wert: "Netto ca. 3.800 €/Monat, nur kleine betriebliche Vorsorge",
      belege: [{ meeting_id: "berger-1", start_sec: 49 }],
    },
    kundenwuensche: {
      wert: "Garantierte lebenslange Rente, etwas Rendite, staatliche Riester-Förderung nutzen",
      belege: [{ meeting_id: "berger-1", start_sec: 67 }],
    },
    anlageziele_horizont: {
      wert: "Sparen bis Renteneintritt mit 67, über 30 Jahre Anlagehorizont",
      belege: [{ meeting_id: "berger-1", start_sec: 92 }],
    },
    risikotoleranz: {
      wert: "Ausgewogen — keine Panik bei Schwankungen, aber nicht alles auf Aktien",
      belege: [{ meeting_id: "berger-1", start_sec: 107 }],
    },
    nachhaltigkeitspraeferenz: {
      wert: null,
      belege: [],
    },
    erteilter_rat: {
      wert: "Fondsgebundene Riester-Rente, 162 €/Monat Beitrag",
      belege: [{ meeting_id: "berger-1", start_sec: 150 }],
    },
    begruendung_des_rats: {
      wert:
        "Volle Grundzulage + 2 Kinderzulagen, Sonderausgabenabzug §10a, Fondsanteil mit Beitragsgarantie bei ausgewogener Risikoneigung",
      belege: [{ meeting_id: "berger-1", start_sec: 119 }],
    },
    hinweise: {
      wert: "Abschluss- und Verwaltungskosten (Zillmerung), nachgelagerte Besteuerung der Rente",
      belege: [{ meeting_id: "berger-1", start_sec: 164 }],
    },
  },
  compliance_gaps: [
    {
      feld: "nachhaltigkeitspraeferenz",
      fehlt: true,
      rechtsgrundlage: "§34d / Geeignetheitsprüfung",
      seit: "2022-08-02",
      severity: "hoch",
      empfehlung: "Im Folgetermin nachholen — ESG-Frage in Agenda aufnehmen",
    },
  ],
  cross_sell: [
    {
      signal: "Hauskauf in 2 Jahren",
      chance: "Wohn-Riester / Baufinanzierung / Risikoleben",
      produkte: ["Wohn-Riester", "Risikoleben"],
      belege: [{ meeting_id: "berger-1", start_sec: 178 }],
    },
  ],
  plan_steps: [
    { schritt: "Beratungsprotokoll erstellt", status: "done" },
    { schritt: "Compliance §34d geprüft — 1 Lücke", status: "warn" },
    { schritt: "Verkaufschance erkannt", status: "done" },
    { schritt: "CRM-Eintrag angelegt", status: "done" },
    { schritt: "Antrag vorbereitet", status: "done" },
    { schritt: "Folgetermin + Einladung", status: "done" },
    { schritt: "Bereit für Q&A", status: "done" },
  ],
  actions: [
    {
      typ: "crm_task",
      titel: "Folgetermin Berger — Wohn-Riester + ESG nachholen",
      faelligkeit: "+7d",
    },
    {
      // Muss EXAKT zur Live-Allowlist in execute-actions/route.ts passen
      // (isAllowedLiveDemoRequest), sonst bleibt die echte Einladung gesperrt.
      typ: "kalender",
      titel: "Folgetermin Berger — Wohn-Riester + ESG nachholen",
      start: "+7d",
      dauer_min: 60,
    },
    {
      typ: "email_entwurf",
      betreff: "Unterlagen Riester-Rente + Terminbestätigung",
      empfaenger: "thomas.berger@example.com",
    },
  ],
};

export const MOCK_QA: QaResult = {
  antwort:
    "Aus beiden Terminen mit Herrn Berger: Die ESG-Frage wurde im zweiten Termin nachgeholt — Artikel-8-Fonds gewünscht. Offen bleibt das Risikoleben-Angebot. Riester mit 162 Euro ausgewogen ist vereinbart.",
  belege: [
    { meeting_id: "berger-1", start_sec: 107 },
    { meeting_id: "berger-2", start_sec: 27 },
  ],
  gedeckt: true,
};
