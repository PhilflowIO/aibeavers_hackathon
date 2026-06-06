"use client";

interface ErrorPanelProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-red-300 bg-red-50 p-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
        !
      </span>
      <h3 className="text-lg font-semibold text-red-950">Analyse fehlgeschlagen</h3>
      <p className="mt-2 max-w-md text-sm text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
