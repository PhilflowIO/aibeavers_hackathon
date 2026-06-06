"use client";

export const PRESET_QUESTIONS = [
  "Wie viel soll Herr Berger monatlich einzahlen?",
  "Zeig alle offenen Punkte aus BEIDEN Terminen",
  "Hat er nachhaltig investieren wollen?",
] as const;

interface PresetQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function PresetQuestions({ onSelect, disabled = false }: PresetQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-left text-xs text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
