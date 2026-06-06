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

  const title = isLive
    ? "Kalendereinladung versendet"
    : "Kalendereinladung vorbereitet (Demo)";

  return (
    <div
      className={`pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up rounded-xl border bg-canvas-raised p-4 ${
        isLive ? "border-sage/30" : "border-border-subtle"
      }`}
      style={{ boxShadow: "var(--shadow-toast)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base ${
            isLive ? "bg-sage-muted text-sage" : "bg-canvas-surface text-ink-muted"
          }`}
          aria-hidden
        >
          ✉
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${isLive ? "text-sage" : "text-ink-muted"}`}>
              {title}
            </p>
            {!isLive && (
              <span className="rounded-full border border-border-subtle bg-canvas-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Mock
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Folgetermin Berger — ESG + Wohn-Riester · thomas.berger@example.com
          </p>
          {isLive && externalId && (
            <p className="mt-1 truncate font-mono text-[10px] text-ink-faint">
              Message-ID: {externalId}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="interactive-focus shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-canvas-surface hover:text-ink-muted"
            aria-label="Schließen"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
