"use client";

export function AntragPanel() {
  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Antrag vorbereitet</h2>
        <p className="panel-heading-sub">Riester-Rente — Felder aus dem Gespräch vorausgefüllt</p>
      </header>

      <p className="mb-4 rounded-lg border border-border-subtle border-l-2 border-l-brass bg-canvas-raised/50 px-3 py-2 text-xs text-ink-faint">
        <span className="font-medium text-ink-muted">Demo:</span> Antrags-Vorbereitung als
        ausgeführte Agent-Aktion — kein Live-Versand an Produktgeber.
      </p>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border-subtle bg-canvas-raised/40">
        <div className="border-b border-border-subtle bg-canvas-surface/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Produktantrag
          </p>
          <p className="mt-0.5 font-medium text-ink">Fondsgebundene Riester-Rente</p>
        </div>

        <dl className="divide-y divide-border-subtle px-4">
          <FieldRow label="Versicherungsnehmer" value="Thomas Berger" prefilled />
          <FieldRow label="Monatsbeitrag" value="162,00 €" prefilled highlight />
          <FieldRow label="Anlagestrategie" value="Ausgewogen" prefilled highlight />
          <FieldRow label="Kinderzulagen" value="2 Kinder — voll ausgeschöpft" prefilled />
          <FieldRow label="Rentenbeginn" value="67 Jahre" prefilled />
          <FieldRow label="Nachhaltigkeit" value="Im Folgetermin nachholen" pending />
          <FieldRow label="Wohn-Riester" value="Option für Hauskauf notiert" prefilled />
        </dl>

        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-xs">
          <span className="text-ink-faint">Bereit zur Unterschrift im Folgetermin</span>
          <span className="font-mono text-ink-muted">11.06.2026</span>
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
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2 sm:gap-4">
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className="text-sm">
        <span
          className={
            pending
              ? "font-medium text-warn"
              : highlight
                ? "font-semibold text-brass"
                : prefilled
                  ? "text-ink"
                  : "text-ink-muted"
          }
        >
          {value}
        </span>
        {prefilled && !pending && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sage">
            auto
          </span>
        )}
        {pending && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-warn">
            offen
          </span>
        )}
      </dd>
    </div>
  );
}
