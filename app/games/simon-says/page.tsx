"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useCallback } from "react";

type Color = 0 | 1 | 2 | 3;

const PADS = [
  { id: 0, color: "bg-cyan-500", activeColor: "bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.8)] scale-105" },
  { id: 1, color: "bg-rose-500", activeColor: "bg-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.8)] scale-105" },
  { id: 2, color: "bg-amber-500", activeColor: "bg-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.8)] scale-105" },
  { id: 3, color: "bg-emerald-500", activeColor: "bg-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.8)] scale-105" },
];

export default function SimonSaysGamePage() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [activePad, setActivePad] = useState<Color | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const { highScore, updateHighScore } = useHighScore("simon_says", 0);

  const playSequence = (seq: Color[]) => {
    setIsPlayback(true);
    setUserStep(0);

    seq.forEach((pad, idx) => {
      setTimeout(() => {
        setActivePad(pad);
        soundManager.playPop();
        setTimeout(() => {
          setActivePad(null);
          if (idx === seq.length - 1) {
            setIsPlayback(false);
          }
        }, 350);
      }, (idx + 1) * 650);
    });
  };

  const startNextRound = useCallback((currentSeq: Color[]) => {
    const nextColor = Math.floor(Math.random() * 4) as Color;
    const newSeq = [...currentSeq, nextColor];
    setSequence(newSeq);
    playSequence(newSeq);
  }, []);

  const startGame = () => {
    setSequence([]);
    setUserStep(0);
    setGameOver(false);
    setIsPlaying(true);
    startNextRound([]);
  };

  const handlePadClick = (padId: Color) => {
    if (!isPlaying || isPlayback || gameOver) return;

    setActivePad(padId);
    soundManager.playPop();
    setTimeout(() => setActivePad(null), 250);

    if (sequence[userStep] === padId) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep === sequence.length) {
        soundManager.playSuccess();
        const score = sequence.length;
        updateHighScore(score);
        setTimeout(() => startNextRound(sequence), 800);
      }
    } else {
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playGameOver();
    }
  };

  return (
    <GameShell
      title="Simon Says"
      description="Memorize and repeat the glowing sound sequence as it grows longer every round!"
      icon="🔔"
      score={sequence.length > 0 ? sequence.length - 1 : 0}
      highScore={highScore}
      isPlaying={isPlaying}
      howToPlayText="Watch the glowing sequence, then repeat it by clicking the colored pads in the exact same order."
    >
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-2 gap-4 max-w-[280px] p-4 rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-2xl">
          {PADS.map((pad) => (
            <button
              key={pad.id}
              onClick={() => handlePadClick(pad.id as Color)}
              disabled={!isPlaying || isPlayback}
              aria-label={`Pad ${pad.id + 1}`}
              className={`aspect-square h-28 w-28 rounded-2xl transition-all duration-150 ${
                activePad === pad.id ? pad.activeColor : `${pad.color} opacity-70 hover:opacity-100`
              }`}
            />
          ))}
        </div>

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <p className="text-xl font-bold text-rose-400">💥 Sequence Missed!</p>
            <p className="text-sm text-slate-300">Rounds Completed: {Math.max(0, sequence.length - 1)}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Play Again" : "Start Sequence"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
