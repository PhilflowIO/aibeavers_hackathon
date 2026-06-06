"use client";

interface ErrorPanelProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-danger-border bg-danger-muted p-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-danger-border bg-canvas-raised text-danger">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path
            d="M11 7v5M11 15h.01"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <h3 className="font-display text-lg text-ink">Analyse fehlgeschlagen</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-6 border-danger-border text-danger hover:bg-danger-muted">
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
