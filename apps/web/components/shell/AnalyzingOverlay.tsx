"use client";

interface AnalyzingOverlayProps {
  visible: boolean;
}

export function AnalyzingOverlay({ visible }: AnalyzingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/70 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-8 py-6 shadow-2xl">
        <div className="relative h-12 w-12">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-500/50 bg-sky-500/10">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
          </span>
        </div>
        <div className="text-center">
          <p className="font-medium text-zinc-100">Gespräch wird analysiert</p>
          <p className="mt-1 text-sm text-zinc-500">
            Protokoll · Compliance · Verkaufschancen · Aktionen
          </p>
        </div>
      </div>
    </div>
  );
}
