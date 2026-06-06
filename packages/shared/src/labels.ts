/** Die 10 Pflichtfelder aus dem Analyse-Prompt (§34d Beratungsdokumentation). */
export const PFLICHTFELDER = [
  "beratungsanlass",
  "kundenangaben",
  "finanzielle_verhaeltnisse",
  "kundenwuensche",
  "anlageziele_horizont",
  "risikotoleranz",
  "nachhaltigkeitspraeferenz",
  "erteilter_rat",
  "begruendung_des_rats",
  "hinweise",
] as const;

export type Pflichtfeld = (typeof PFLICHTFELDER)[number];

export const PFLICHTFELD_LABELS: Record<Pflichtfeld, string> = {
  beratungsanlass: "Beratungsanlass",
  kundenangaben: "Kundenangaben",
  finanzielle_verhaeltnisse: "Finanzielle Verhältnisse",
  kundenwuensche: "Kundenwünsche",
  anlageziele_horizont: "Anlageziele & Horizont",
  risikotoleranz: "Risikotoleranz",
  nachhaltigkeitspraeferenz: "Nachhaltigkeitspräferenz (ESG)",
  erteilter_rat: "Erteilter Rat",
  begruendung_des_rats: "Begründung des Rats",
  hinweise: "Hinweise & Risiken",
};

/** Pitch-/UI-Terminologie (Judges-Credibility). */
export const TERMINOLOGIE = {
  "§34d": "Beratungsdokumentation",
  "§34f": "Geeignetheitserklärung",
} as const;
