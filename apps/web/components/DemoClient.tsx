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
      <main className="demo-grain flex min-h-screen items-center justify-center p-6">
        <p className="rounded-lg border border-danger-border bg-danger-muted px-5 py-4 text-sm text-danger">
          {loadError}
        </p>
      </main>
    );
  }

  if (!transcript) {
    return (
      <main className="demo-grain flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-brass/25 border-t-brass"
          aria-hidden
        />
        <p className="text-sm text-ink-faint" aria-live="polite">
          Transkript wird geladen…
        </p>
      </main>
    );
  }

  return (
    <BelegJumpController meetings={transcript.meetings}>
      <div className="demo-grain flex min-h-screen flex-col">
        <AppShell transcript={transcript} />

        <section className="border-t border-border-subtle bg-canvas/50 px-6 pb-8 pt-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  Quellenbeleg
                </p>
                <h2 className="mt-1 font-display text-lg text-ink">
                  Gesprächstranskript · {transcript.kunde}
                </h2>
                <p className="mt-1 text-xs text-ink-faint">
                  Beleg-Chips in den Panels springen zur markierten Stelle
                </p>
              </div>
              <MeetingTabs meetings={transcript.meetings} />
            </div>
            <div className="panel-surface h-72 p-4 lg:h-80">
              <TranscriptViewer meetings={transcript.meetings} />
            </div>
          </div>
        </section>
      </div>
    </BelegJumpController>
  );
}
