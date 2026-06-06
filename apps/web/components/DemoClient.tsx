"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./shell/AppShell";
import { BelegJumpController } from "./grounding/BelegJumpController";
import { MeetingTabs } from "./transcript/MeetingTabs";
import { TranscriptViewer } from "./transcript/TranscriptViewer";
import type { Transcript } from "../lib/types";

export function DemoClient() {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/demo-transcript.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Transkript nicht geladen (${r.status})`);
        return r.json() as Promise<Transcript>;
      })
      .then(setTranscript)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Ladefehler");
      });
  }, []);

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-red-800">
        {loadError}
      </main>
    );
  }

  if (!transcript) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
      </main>
    );
  }

  return (
    <BelegJumpController meetings={transcript.meetings}>
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <AppShell transcript={transcript} />

        <section className="border-t border-zinc-800 px-6 pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Gesprächstranskript · {transcript.kunde}
            </h2>
            <MeetingTabs meetings={transcript.meetings} />
          </div>
          <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
            <TranscriptViewer meetings={transcript.meetings} />
          </div>
        </section>
      </div>
    </BelegJumpController>
  );
}
