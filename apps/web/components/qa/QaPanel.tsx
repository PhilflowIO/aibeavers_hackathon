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
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <header>
        <h2 className="text-sm font-semibold text-zinc-100">Frage stellen</h2>
        <p className="text-xs text-zinc-500">
          Antworten mit Belegen aus dem Transkript
        </p>
      </header>

      <PresetQuestions
        disabled={loading}
        onSelect={(preset) => submit(preset)}
      />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Eigene Frage eingeben…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="shrink-0 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "…" : "Fragen"}
        </button>
      </form>
    </section>
  );
}
