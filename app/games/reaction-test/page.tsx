"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useRef } from "react";

type TestState = "idle" | "waiting" | "ready" | "too-early" | "result";

export default function ReactionTestGamePage() {
  const [state, setState] = useState<TestState>("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);

  const { highScore: bestMs, updateHighScore: updateBestMs } = useHighScore("reaction_test", 999);

  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTest = () => {
    setState("waiting");
    setReactionTime(null);
    soundManager.playBlip();

    const randomDelay = Math.floor(Math.random() * 2500) + 1500;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setState("ready");
      startTimeRef.current = performance.now();
      soundManager.playPop();
    }, randomDelay);
  };

  const handleClick = () => {
    if (state === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("too-early");
      soundManager.playExplosion();
    } else if (state === "ready" && startTimeRef.current !== null) {
      const ms = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(ms);
      setState("result");
      soundManager.playSuccess();
      updateBestMs(ms);
    }
  };

  return (
    <GameShell
      title="Reaction Time Test"
      description="Test your nervous system response speed! Click as fast as possible when red turns green."
      icon="⚡"
      score={reactionTime || 0}
      highScore={bestMs === 999 ? 0 : bestMs}
      scoreLabel="Time (ms)"
      highScoreLabel="Best (ms)"
      isPlaying={state !== "idle"}
      howToPlayText="Click 'Start Test'. Wait until the screen turns bright GREEN, then click or tap instantly! Clicking while red results in a false start."
    >
      <div className="flex flex-col items-center">
        {/* Interactive Click Box */}
        <div
          onClick={state === "idle" ? startTest : handleClick}
          className={`h-72 w-full max-w-md rounded-3xl border-4 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 select-none shadow-2xl ${
            state === "idle"
              ? "border-cyan-500/40 bg-slate-950 text-cyan-200 hover:border-cyan-400"
              : state === "waiting"
              ? "border-rose-500 bg-rose-950/80 text-rose-200 animate-pulse"
              : state === "ready"
              ? "border-emerald-400 bg-emerald-500 text-slate-950 scale-105 shadow-[0_0_40px_rgba(52,211,153,0.8)]"
              : state === "too-early"
              ? "border-amber-500 bg-amber-950/80 text-amber-200"
              : "border-cyan-400 bg-cyan-950/80 text-cyan-100"
          }`}
        >
          {state === "idle" && (
            <>
              <span className="text-5xl mb-3">⚡</span>
              <p className="text-xl font-bold">Click Anywhere to Start</p>
            </>
          )}

          {state === "waiting" && (
            <>
              <span className="text-5xl mb-3">🔴</span>
              <p className="text-xl font-bold">Wait for GREEN...</p>
            </>
          )}

          {state === "ready" && (
            <>
              <span className="text-6xl mb-2 animate-bounce">🟢</span>
              <p className="text-3xl font-black uppercase">CLICK NOW!</p>
            </>
          )}

          {state === "too-early" && (
            <>
              <span className="text-5xl mb-3">⚠️</span>
              <p className="text-xl font-bold">Too Early!</p>
              <p className="text-xs text-amber-300 mt-1">Click to try again</p>
            </>
          )}

          {state === "result" && (
            <>
              <span className="text-5xl mb-2">⚡</span>
              <p className="text-4xl font-black text-cyan-300">{reactionTime} ms</p>
              <p className="text-xs text-slate-300 mt-2">Click anywhere to try again</p>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={startTest}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {state === "idle" ? "Start Test" : "Retry Test"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
