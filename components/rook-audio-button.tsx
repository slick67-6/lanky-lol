"use client";

import { useRef, useState } from "react";

const TIKI_TIKI_AUDIO_SRC = "/tiki-tiki-slowed.mp3";

export function RookAudioButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const playTikiTiki = async () => {
    setPlaybackError(null);

    const audio = audioRef.current;

    if (!audio) {
      setPlaybackError("Audio is not ready yet. Please try again.");
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setPlaybackError("Playback was blocked. Please tap the rook again.");
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      <audio
        ref={audioRef}
        src={TIKI_TIKI_AUDIO_SRC}
        preload="auto"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      {playbackError ? (
        <p className="max-w-52 rounded-2xl border border-rose-400/30 bg-rose-950/80 px-3 py-2 text-right text-xs text-rose-100 shadow-lg backdrop-blur">
          {playbackError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={playTikiTiki}
        aria-label="Play Tiki Tiki slowed audio"
        aria-pressed={isPlaying}
        title="Play Tiki Tiki slowed audio"
        className="group grid size-16 place-items-center rounded-2xl border border-cyan-300/40 bg-slate-950/85 text-4xl text-cyan-100 shadow-[0_18px_50px_-18px_rgba(34,211,238,0.9)] outline-none backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-cyan-200 hover:bg-cyan-950/90 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-0"
      >
        <span
          aria-hidden="true"
          className={isPlaying ? "animate-pulse" : "transition group-hover:scale-110"}
        >
          ♜
        </span>
      </button>
    </div>
  );
}
