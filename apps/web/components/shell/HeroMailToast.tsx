"use client";

interface HeroMailToastProps {
  visible: boolean;
  onDismiss?: () => void;
}

export function HeroMailToast({ visible, onDismiss }: HeroMailToastProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up rounded-xl border border-emerald-500/40 bg-zinc-900 p-4 shadow-2xl shadow-emerald-900/20"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-lg text-emerald-400">
          ✉
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-300">Kalendereinladung versendet</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Folgetermin Berger — ESG + Wohn-Riester · thomas.berger@example.com
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
            aria-label="Schließen"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
