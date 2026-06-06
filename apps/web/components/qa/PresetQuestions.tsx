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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Beispielfragen">
      {PRESET_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="min-h-[36px] max-w-full rounded-full border border-border bg-canvas-raised/80 px-3 py-2 text-left text-xs leading-snug text-ink-muted transition duration-200 hover:border-brass-glow hover:bg-brass-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
