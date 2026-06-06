"use client";

import { useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "../../lib/api-client";

interface VoicePlayerProps {
  text?: string;
  src?: string;
}

export function VoicePlayer({ text, src }: VoicePlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | undefined>(src);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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
          setError(err instanceof Error ? err.message : "Sprachausgabe nicht verfügbar");
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
    <div className="qa-voice flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-canvas-raised/60 px-3 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Voice</span>

      {loading && (
        <span className="flex items-center gap-2 text-xs text-ink-faint">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brass/25 border-t-brass" />
          Audio wird geladen…
        </span>
      )}

      {!loading && audioUrl && (
        <>
          {playing && (
            <span className="flex items-center gap-1 text-xs text-sage">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
              Spielt ab
            </span>
          )}
          <audio
            ref={audioRef}
            controls
            autoPlay
            preload="none"
            src={audioUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="h-9 min-w-[200px] max-w-full flex-1 accent-brass"
          />
        </>
      )}

      {!loading && !audioUrl && (
        <p className="text-xs text-ink-faint">
          {error
            ? `Sprachausgabe nicht verfügbar (${error}) — Textantwort oben`
            : "ElevenLabs nicht konfiguriert — Textantwort oben"}
        </p>
      )}
    </div>
  );
}
