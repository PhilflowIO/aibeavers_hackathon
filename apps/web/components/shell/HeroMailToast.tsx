"use client";

interface HeroMailToastProps {
  visible: boolean;
  onDismiss?: () => void;
}

export function HeroMailToast({ visible, onDismiss }: HeroMailToastProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up rounded-xl border border-sage/30 bg-canvas-raised p-4"
      style={{ boxShadow: "var(--shadow-toast)" }}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-muted text-base text-sage"
          aria-hidden
        >
          ✉
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sage">Kalendereinladung versendet</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            Folgetermin Berger — ESG + Wohn-Riester · thomas.berger@example.com
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-canvas-surface hover:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
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
