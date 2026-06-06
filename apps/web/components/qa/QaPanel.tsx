"use client";

import { FormEvent, useState } from "react";

import { PresetQuestions } from "./PresetQuestions";

interface QaPanelProps {
  onAsk: (question: string) => void;
  loading?: boolean;
}

export function QaPanel({ onAsk, loading = false }: QaPanelProps) {
  const [question, setQuestion] = useState("");

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
    setQuestion("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(question);
  };

  return (
    <section className="qa-panel flex flex-col gap-4 rounded-xl border border-border-subtle bg-canvas-raised/40 p-4">
      <header>
        <h3 className="text-sm font-semibold text-ink">Frage stellen</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          Antworten nur aus dem Transkript — mit Quellenbelegen
        </p>
      </header>

      <PresetQuestions disabled={loading} onSelect={(preset) => submit(preset)} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Eigene Frage eingeben…"
          disabled={loading}
          aria-label="Eigene Frage"
          className="input-editorial min-h-[44px]"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md bg-brass px-5 py-2 text-sm font-semibold text-canvas transition hover:bg-brass-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "…" : "Fragen"}
        </button>
      </form>
    </section>
  );
}
