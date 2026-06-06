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
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      {disabled ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Analysiert Gespräch…
        </>
      ) : (
        label
      )}
    </button>
  );
}
