"use client";

interface HeroMailToastProps {
  visible: boolean;
  /** true nur bei echtem Live-Versand (success + Message-ID). */
  isLive?: boolean;
  /** Message-ID des realen Versands (nur bei Live). */
  externalId?: string;
  onDismiss?: () => void;
}

export function HeroMailToast({
  visible,
  isLive = false,
  externalId,
  onDismiss,
}: HeroMailToastProps) {
  if (!visible) return null;

  const tone = isLive
    ? "border-emerald-200 shadow-emerald-900/10"
    : "border-zinc-300 shadow-zinc-900/10";
  const iconTone = isLive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-zinc-200 text-zinc-600";
  const titleTone = isLive ? "text-emerald-800" : "text-zinc-700";
  const title = isLive
    ? "Kalendereinladung versendet"
    : "Kalendereinladung vorbereitet (Demo)";

  return (
    <div
      className={`pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up rounded-xl border bg-white p-4 shadow-2xl ${tone}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${iconTone}`}>
          ✉
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${titleTone}`}>{title}</p>
            {!isLive && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Mock
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Folgetermin Berger — ESG + Wohn-Riester · thomas.berger@example.com
          </p>
          {isLive && externalId && (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400">
              Message-ID: {externalId}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-zinc-500 hover:text-zinc-200"
            aria-label="Schließen"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
