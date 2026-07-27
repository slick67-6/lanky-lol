"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useEffect, useRef, useCallback } from "react";

type MoleType = "normal" | "golden" | "trap";

interface ActiveMole {
  holeIndex: number;
  type: MoleType;
}

export default function WhackAMoleGamePage() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMole, setActiveMole] = useState<ActiveMole | null>(null);

  const timerRef = useRef<number | null>(null);
  const moleTimerRef = useRef<number | null>(null);

  const { highScore, updateHighScore } = useHighScore("whack_a_mole", 0);

  const holes = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const spawnMole = useCallback(() => {
    const randomHole = Math.floor(Math.random() * holes.length);
    const rand = Math.random();
    let type: MoleType = "normal";
    if (rand < 0.2) type = "golden";
    else if (rand < 0.4) type = "trap";

    setActiveMole({ holeIndex: randomHole, type });

    const duration = type === "golden" ? 550 : 800;
    setTimeout(() => {
      setActiveMole((current) => (current?.holeIndex === randomHole ? null : current));
    }, duration);
  }, [holes.length]);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setActiveMole(null);
    soundManager.playBlip();

    if (timerRef.current) clearInterval(timerRef.current);
    if (moleTimerRef.current) clearInterval(moleTimerRef.current);

    moleTimerRef.current = window.setInterval(spawnMole, 900);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(moleTimerRef.current!);
          setIsPlaying(false);
          setActiveMole(null);
          soundManager.playWin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleWhack = (index: number) => {
    if (!isPlaying || !activeMole || activeMole.holeIndex !== index) {
      if (isPlaying) {
        soundManager.playHit();
        setStreak(0);
      }
      return;
    }

    const { type } = activeMole;
    setActiveMole(null);

    if (type === "trap") {
      soundManager.playExplosion();
      setStreak(0);
      setScore((s) => Math.max(0, s - 10));
    } else {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (type === "golden") soundManager.playPowerup();
      else soundManager.playPop();

      const points = (type === "golden" ? 30 : 10) + nextStreak * 2;
      setScore((s) => {
        const newScore = s + points;
        updateHighScore(newScore);
        return newScore;
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
    };
  }, []);

  return (
    <GameShell
      title="Whack-a-Mole"
      description="Whack moles for points! Golden moles give +30, trap moles deduct points. Build streak multipliers!"
      icon="🔨"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      howToPlayText="Click or tap moles as soon as they pop up. Golden Moles (🌟) yield bonus points. Avoid Trap Moles (💣)!"
      customControls={
        <div className="flex items-center gap-6 text-sm font-semibold text-cyan-200">
          <span>Time: <strong className="text-cyan-400">{timeLeft}s</strong></span>
          <span>Streak: <strong className="text-amber-400">{streak}x</strong></span>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-3 gap-4 max-w-[360px] p-4 rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-2xl">
          {holes.map((index) => {
            const isMoleHere = activeMole?.holeIndex === index;
            const moleType = activeMole?.type;

            return (
              <button
                key={index}
                onClick={() => handleWhack(index)}
                disabled={!isPlaying}
                aria-label={`Hole ${index + 1}`}
                className={`aspect-square h-24 w-24 rounded-2xl border-2 text-4xl flex items-center justify-center transition-all duration-150 ${
                  isMoleHere
                    ? moleType === "golden"
                      ? "border-amber-400 bg-amber-950/80 scale-110 shadow-[0_0_25px_rgba(251,191,36,0.6)]"
                      : moleType === "trap"
                      ? "border-rose-500 bg-rose-950/80 scale-110 shadow-[0_0_25px_rgba(244,63,94,0.6)]"
                      : "border-cyan-400 bg-cyan-950/80 scale-105 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                    : "border-slate-800 bg-slate-900/60 hover:border-cyan-500/30"
                }`}
              >
                {isMoleHere ? (moleType === "golden" ? "🌟" : moleType === "trap" ? "💣" : "🐹") : "🕳️"}
              </button>
            );
          })}
        </div>

        {!isPlaying && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              {timeLeft === 0 ? "🎉 Time's Up!" : "Ready to Play!"}
            </p>
            {timeLeft === 0 && <p className="text-sm text-slate-300">Final Score: {score}</p>}
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {isPlaying ? "Restart" : timeLeft === 0 ? "Play Again" : "Start Game"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
