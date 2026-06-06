"use client";

import { useEffect, useState } from "react";
import { synthesizeSpeech } from "../../lib/api-client";

interface VoicePlayerProps {
  text?: string;
  src?: string;
}

export function VoicePlayer({ text, src }: VoicePlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | undefined>(src);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (src) {
      setAudioUrl(src);
      return;
    }
    if (!text?.trim()) {
      setAudioUrl(undefined);
      return;
    }

    let revoked: string | undefined;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await synthesizeSpeech(text);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setAudioUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Sprachausgabe nicht verfügbar",
          );
          setAudioUrl(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [text, src]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Voice
      </span>
      {loading && (
        <span className="text-xs text-zinc-500">Audio wird geladen…</span>
      )}
      {!loading && audioUrl && (
        <audio
          controls
          autoPlay
          preload="none"
          src={audioUrl}
          className="h-8 max-w-full flex-1 accent-violet-500"
        />
      )}
      {!loading && !audioUrl && (
        <span className="text-xs text-zinc-500">
          {error ?? "ElevenLabs nicht konfiguriert — Textantwort oben"}
        </span>
      )}
    </div>
  );
}
