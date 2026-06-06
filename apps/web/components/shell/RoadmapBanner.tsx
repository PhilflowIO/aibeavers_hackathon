"use client";

export function RoadmapBanner() {
  return (
    <aside
      className="flex items-start gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-500"
      role="note"
    >
      <span className="mt-0.5 text-zinc-600" aria-hidden>
        ℹ
      </span>
      <p>
        <span className="text-zinc-400">Ehrlich:</span> CRM- und Antrags-Integrationen laufen
        heute als ausgeführte Demo-Aktionen — echte HubSpot/Pipedrive-Anbindung folgt in der
        nächsten Iteration.
      </p>
    </aside>
  );
}
