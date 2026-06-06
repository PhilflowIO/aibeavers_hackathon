"use client";

export function AntragPanel() {
  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Antrag vorbereitet</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Riester-Rente — Felder aus dem Gespräch vorausgefüllt
        </p>
      </header>

      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 bg-zinc-800/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Produktantrag
          </p>
          <p className="mt-0.5 font-medium text-zinc-100">Fondsgebundene Riester-Rente</p>
        </div>

        <dl className="divide-y divide-zinc-800 px-4">
          <FieldRow label="Versicherungsnehmer" value="Thomas Berger" prefilled />
          <FieldRow label="Monatsbeitrag" value="162,00 €" prefilled highlight />
          <FieldRow label="Anlagestrategie" value="Ausgewogen" prefilled highlight />
          <FieldRow label="Kinderzulagen" value="2 Kinder — voll ausgeschöpft" prefilled />
          <FieldRow label="Rentenbeginn" value="67 Jahre" prefilled />
          <FieldRow label="Nachhaltigkeit" value="— im Folgetermin —" pending />
          <FieldRow label="Wohn-Riester" value="Option für Hauskauf notiert" prefilled />
        </dl>

        <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          Bereit zur Unterschrift im Folgetermin · 11.06.2026
        </div>
      </div>
    </article>
  );
}

function FieldRow({
  label,
  value,
  prefilled,
  highlight,
  pending,
}: {
  label: string;
  value: string;
  prefilled?: boolean;
  highlight?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 py-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm">
        <span
          className={
            pending
              ? "text-amber-800"
              : highlight
                ? "font-semibold text-sky-800"
                : prefilled
                  ? "text-zinc-200"
                  : "text-zinc-400"
          }
        >
          {value}
        </span>
        {prefilled && !pending && (
          <span className="ml-2 text-[10px] uppercase text-emerald-500/80">auto</span>
        )}
      </dd>
    </div>
  );
}
