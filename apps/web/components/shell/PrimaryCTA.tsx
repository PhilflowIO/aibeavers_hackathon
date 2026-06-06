"use client";

interface PrimaryCTAProps {
  onStart: () => void;
  disabled?: boolean;
  label?: string;
}

export function PrimaryCTA({
  onStart,
  disabled = false,
  label = "Nacharbeit starten",
}: PrimaryCTAProps) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-md bg-brass px-6 py-2.5 text-sm font-semibold text-canvas shadow-[0_1px_0_oklch(1_0_0/0.15)_inset,0_8px_24px_-8px_var(--brass-glow)] transition-all duration-200 hover:bg-brass-hover hover:shadow-[0_1px_0_oklch(1_0_0/0.2)_inset,0_12px_28px_-6px_var(--brass-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
    >
      {disabled ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas"
            aria-hidden
          />
          Analysiert Gespräch…
        </>
      ) : (
        <>
          {label}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="opacity-90"
            aria-hidden
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  );
}
