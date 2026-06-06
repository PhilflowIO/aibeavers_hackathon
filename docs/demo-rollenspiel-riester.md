# Demo-Rollenspiel — Altersvorsorge / Riester (zum Aufnehmen)

**Zweck:** realistisches, aufnehmbares Beratungsgespräch als ehrlicher Demo-Input. *„Daten zu kriegen ist im Eval-Thema immer schwierig — wir hatten nichts, also haben wir ein Gespräch simuliert und vorbereitet."* (genau dein Frame).

**Rollen:** Berater = **B** (Phil) · Kunde = **K** (Jacob / Person). Dauer ~6–8 Min, natürlich sprechen, ruhig stocken/umformulieren — echtes Audio ist besser als perfektes.

**Bewusst eingebaut (die Agenten-Hero-Momente):**
- 🚨 **Die ESG-/Nachhaltigkeitsfrage FEHLT komplett** → der Agent fängt die Compliance-Lücke (Pflicht für §34d seit 02.08.2022).
- 💰 **Cross-Sell-Anker:** K erwähnt beiläufig „Hauskauf in 2 Jahren" → Agent macht daraus Wohn-Riester/Baufi/Risikoleben.
- 🔎 **Grounded-Q&A-Ziel:** konkrete vereinbarte Sparrate **162 €/Monat** + Risikoneigung „ausgewogen" → die fragt man den Agenten später ab.
- Alle Pflichtfelder (A1/A2 aus `beratungsprotokoll-vorlage-und-demo-transkripte.md`) kommen vor.

---

**B:** Schön, dass es geklappt hat, Herr Berger. Sie hatten am Telefon gesagt, es geht Ihnen um Ihre Altersvorsorge — was war der konkrete Anlass? *[beratungsanlass]*

**K:** Genau. Ich hab neulich meine Renteninformation bekommen, und da klafft eine ziemliche Lücke. Ich will da jetzt was machen, bevor noch mehr Zeit vergeht.

**B:** Verstehe. Dann lassen Sie uns kurz Ihre Situation aufnehmen. Wie alt sind Sie, Familienstand, Beruf? *[kundenangaben]*

**K:** 34, verheiratet, zwei Kinder — vier und sieben. Ich bin Angestellter im Maschinenbau, unbefristet.

**B:** Und das Nettoeinkommen, ungefähr? Plus: gibt es schon was an Vorsorge? *[finanzielle_verhaeltnisse]*

**K:** Netto so 3.800 im Monat. An Vorsorge hab ich nur eine kleine betriebliche, sonst nichts Privates.

**B:** Okay. Und Ihre Frau — arbeitet sie, eigene Ansprüche?

**K:** Teilzeit, baut gerade wieder auf. Aber wir planen das zusammen.

**B:** Gut. Was ist Ihnen bei der Vorsorge am wichtigsten — maximale Sicherheit, oder darf auch Renditechance dabei sein? *[kundenwuensche]*

**K:** Ehrlich gesagt beides ein bisschen. Ich will eine garantierte lebenslange Rente am Ende, aber ich bin ja noch jung — etwas Rendite darf schon sein. Und die staatliche Förderung würd ich gern mitnehmen, ich hab gehört mit zwei Kindern lohnt sich Riester.

**B:** Da hören Sie richtig. Bis wann wollen Sie sparen — Regelaltersgrenze 67? *[anlageziele / horizont]*

**K:** Ja, bis 67. Sind ja noch über 30 Jahre.

**B:** Und wie würden Sie Ihre Risikoneigung einschätzen, wenn der Wert mal schwankt — sicherheitsorientiert, ausgewogen, oder chancenorientiert? *[risikotoleranz]*

**K:** Ausgewogen, würde ich sagen. Ich krieg keine Panik, wenn's mal runtergeht, aber alles auf Aktien wär mir zu heiß.

> 🚨 **HIER FEHLT die Nachhaltigkeitspräferenz-Frage.** B fragt sie bewusst NICHT. Direkt weiter zur Empfehlung — genau das ist die Lücke, die der Agent später fängt.

**B:** Dann passt für Sie eine **fondsgebundene Riester-Rente** sehr gut. *[erteilter_rat]* Begründung: Sie haben mit zwei Kindern die volle Grundzulage plus zwei Kinderzulagen, dazu den Sonderausgabenabzug über §10a — das senkt Ihren Effektivbeitrag deutlich. Und weil Sie über 30 Jahre Zeit haben und ausgewogen unterwegs sind, können wir einen Fondsanteil reinnehmen, der die Renditechance bringt, mit Beitragsgarantie zum Rentenbeginn. *[begruendung_des_rats]*

**K:** Klingt gut. Was kostet mich das im Monat?

**B:** Sinnvoll wären bei Ihrem Einkommen **162 Euro im Monat** — damit schöpfen Sie die Zulagen voll aus. *[Grounded-Q&A-Ziel: 162 €]*

**K:** Okay, machbar.

**B:** Wichtig noch die Hinweise: es gibt Abschluss- und Verwaltungskosten, die anfangs verrechnet werden — Stichwort Zillmerung —, und die Rente wird später nachgelagert besteuert. *[hinweise]*

**K:** Verstanden. Ah — eine Sache noch: wir wollen eigentlich in zwei Jahren ein Haus kaufen. Spielt das hier rein?

> 💰 **CROSS-SELL-ANKER.** B geht hier bewusst NICHT tief drauf ein — der Agent macht später die Verbindung (Wohn-Riester / Baufi / Risikoleben).

**B:** Das kann später relevant werden, dazu machen wir beim nächsten Termin was. Für heute halten wir die Riester-Rente fest. Ich schick Ihnen die Unterlagen, und wir sehen uns nächste Woche zum Abschluss.

**K:** Super, danke Ihnen.

---

## Was der Agent danach demonstriert (die drei Hero-Momente)
1. **🚨 Compliance-Lücke (Hero):** *„In diesem Gespräch wurde die Nachhaltigkeitspräferenz nicht abgefragt — seit 02.08.2022 Pflicht in der Geeignetheitsprüfung. Ohne sie ist die Beratung angreifbar. Ich habe die Frage für den Folgetermin vorbereitet."* → Agent reasoning + proaktives Handeln.
2. **💰 Cross-Sell:** *„Herr Berger plant Hauskauf in ~2 Jahren → Wohn-Riester-Option, Baufinanzierung, Risikoleben offen. Soll ich den Folgetermin-Vorschlag entwerfen?"*
3. **🔎 Grounded Q&A:** Frage *„Welche Sparrate und Risikoneigung haben wir vereinbart?"* → *„162 €/Monat, Risikoneigung ausgewogen"* + **klickbarer Beleg** zur Stelle. Gegenprobe: eine Frage, die NICHT im Gespräch war → *„dafür finde ich keine Stelle."*
4. **Bonus-Closer:** das fertige Beratungsprotokoll fällt raus.

---

# Teil 2 — Folgetermin (zweites Gespräch, zum Aufnehmen)

**Zweck:** das *zweite* Gespräch desselben Kunden, damit der **Cross-Call-/System-of-Record-Beat (ACT 3)** demobar ist — *„zeig mir alle offenen Punkte von Herrn Berger aus BEIDEN Terminen"*. ~2–3 Min, kurz.

**Bewusst eingebaut:** (1) die ESG-Lücke aus Termin 1 wird **jetzt geschlossen** (Berater fragt die Nachhaltigkeitspräferenz nach) → der Agent kann „im 2. Termin nachgeholt ✓" belegen. (2) Der Hauskauf-Cross-Sell wird **aufgegriffen** (Wohn-Riester). (3) Ein **neuer offener Punkt** bleibt (Risikoleben-Angebot zugesagt, noch nicht erstellt) → das ist die „offene Lücke aus beiden Terminen".

---

**B:** Schön, dass wir gleich weitermachen, Herr Berger. Heute machen wir die Riester-Rente fertig — und ich hab noch zwei Punkte vom letzten Mal mitgenommen.

**K:** Sehr gut, ja.

**B:** Erstens, und das hatte ich beim ersten Termin versäumt: Wie wichtig ist Ihnen, dass Ihr Geld **nachhaltig** angelegt wird? Sollen die Beiträge ausschließlich in nachhaltige Fonds nach Artikel 8 oder 9 SFDR fließen?
> ✅ **ESG-Lücke wird hier geschlossen** — genau die Frage, die der Agent in Termin 1 als fehlend geflaggt hat.

**K:** Doch, das ist mir wichtig. Nicht um jeden Preis Rendite, aber ich will nicht in irgendwelche fragwürdigen Sachen investieren. Artikel 8 reicht mir.

**B:** Notiere ich so — nachhaltigkeitsorientiert, Artikel 8. Damit passt die Empfehlung weiterhin. *[nachhaltigkeitspraeferenz nachgeholt]*

**B:** Zweiter Punkt: Sie hatten den **Hauskauf in zwei Jahren** erwähnt. Da gibt es den Wohn-Riester — Sie könnten das geförderte Kapital später fürs Eigenheim einsetzen. Wollen wir das einplanen?
> 💰 **Cross-Sell aufgegriffen** — der Anker aus Termin 1 wird zur konkreten Maßnahme.

**K:** Ah, interessant. Ja, das klingt sinnvoll. Lass uns das so aufsetzen, dass ich später umschichten kann.

**B:** Mach ich. Und weil Sie zwei Kinder haben und bald das Haus finanzieren: Sie sollten Ihre Arbeitskraft und die Familie absichern. Ich schick Ihnen die Tage ein **Angebot für eine Risikolebensversicherung** — das besprechen wir dann separat.
> 🔎 **Neuer offener Punkt:** Risikoleben-Angebot zugesagt, noch NICHT erstellt → bleibt „offen über beide Termine".

**K:** Passt, danke. Dann machen wir die Riester jetzt klar.

**B:** Genau. Unterschrift hier, und Sie kriegen alles per Mail.

---

## Was ACT 3 (Cross-Call) damit zeigt
Frage per Voice: *„Welche offenen Punkte hat Herr Berger über beide Termine?"* → Agent antwortet **belegt über beide Gespräche**:
- *Termin 1:* ESG-Präferenz fehlte (Compliance-Lücke) → **in Termin 2 nachgeholt ✓** (Art. 8 SFDR).
- *Termin 2:* Wohn-Riester eingeplant; **Risikolebensversicherung zugesagt, Angebot noch offen.**
→ jede Aussage mit klickbarem Beleg zur Stelle. **Das ist der Beat, den Otter/keasy strukturell nicht können** (kein Bestandsmodell, hören nicht zu) = „Firma statt Button".
