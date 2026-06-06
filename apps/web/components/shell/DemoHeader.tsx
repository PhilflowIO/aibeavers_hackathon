"use client";

export function DemoHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sky-800">
            Nacharbeits-Agent · Demo
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-50">
            Thomas Berger
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Erstberatung Altersvorsorge / Riester — der Agent führt die Nacharbeit aus,
            nicht nur das Protokoll.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Kunde</p>
          <p className="text-sm font-medium text-zinc-200">Thomas Berger</p>
          <p className="text-xs text-zinc-500">berger-1 · 28.05.2026</p>
        </div>
      </div>
    </header>
  );
}
