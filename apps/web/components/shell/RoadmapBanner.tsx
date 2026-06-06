"use client";

export function RoadmapBanner() {
  return (
    <aside
      className="flex items-start gap-3 rounded-lg border border-border-subtle border-l-2 border-l-brass/40 bg-canvas-raised/50 px-4 py-2.5"
      role="note"
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brass-muted text-[11px] font-semibold text-brass"
        aria-hidden
      >
        i
      </span>
      <p className="text-xs leading-relaxed text-ink-faint">
        <span className="font-medium text-ink-muted">Ehrlich:</span> CRM- und
        Antrags-Integrationen laufen heute als ausgeführte Demo-Aktionen — echte
        HubSpot/Pipedrive-Anbindung folgt in der nächsten Iteration.
      </p>
    </aside>
  );
}
