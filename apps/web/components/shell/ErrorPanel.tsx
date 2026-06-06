"use client";

interface ErrorPanelProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-400">
        !
      </span>
      <h3 className="text-lg font-semibold text-red-200">Analyse fehlgeschlagen</h3>
      <p className="mt-2 max-w-md text-sm text-red-300/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
