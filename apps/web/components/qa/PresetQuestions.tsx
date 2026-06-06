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
    <div className="flex flex-wrap gap-1.5">
      {PRESET_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
