"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useEffect, useRef, useCallback } from "react";

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  spawnTime: number;
}

function getRandomTarget(id: number, spawnTime: number = 0): Target {
  const margin = 40;
  const x = Math.floor(Math.random() * (360 - margin * 2)) + margin;
  const y = Math.floor(Math.random() * (320 - margin * 2)) + margin;
  return { id, x, y, size: 50, spawnTime };
}

export default function AimTrainerGamePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [clickDelays, setClickDelays] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef<number | null>(null);
  const nextTargetIdRef = useRef(1);

  const { highScore: bestHits, updateHighScore: updateBestHits } = useHighScore("aim_trainer", 0);

  const spawnTarget = useCallback(() => {
    const newTarget = getRandomTarget(nextTargetIdRef.current++);
    setTargets([newTarget]);
  }, []);

  const startGame = () => {
    setHits(0);
    setMisses(0);
    setClickDelays([]);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    spawnTarget();
    soundManager.playBlip();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          setIsPlaying(false);
          soundManager.playWin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleHit = (target: Target, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;

    if (target.spawnTime > 0) {
      const reaction = Math.round(e.timeStamp - target.spawnTime);
      if (reaction > 0 && reaction < 5000) {
        setClickDelays((prev) => [...prev, reaction]);
      }
    }

    soundManager.playHit();
    setHits((h) => {
      const next = h + 1;
      updateBestHits(next);
      return next;
    });

    const nextTarget = getRandomTarget(nextTargetIdRef.current++, e.timeStamp);
    setTargets([nextTarget]);
  };

  const handleMiss = () => {
    if (!isPlaying) return;
    soundManager.playExplosion();
    setMisses((m) => m + 1);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const totalClicks = hits + misses;
  const accuracy = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 100;
  const avgReaction =
    clickDelays.length > 0
      ? Math.round(clickDelays.reduce((a, b) => a + b, 0) / clickDelays.length)
      : 0;

  return (
    <GameShell
      title="Aim Trainer"
      description="Test your reflex speed, target tracking precision, and reaction times in 30 seconds!"
      icon="🎯"
      score={hits}
      highScore={bestHits}
      scoreLabel="Targets Hit"
      highScoreLabel="Best Hits"
      isPlaying={isPlaying}
      howToPlayText="Click targets as soon as they spawn. Fast and accurate clicks boost your score. Missing targets penalizes accuracy!"
      customControls={
        <div className="flex justify-around w-full max-w-md text-sm font-semibold text-cyan-200">
          <span>Time: <strong className="text-cyan-400">{timeLeft}s</strong></span>
          <span>Accuracy: <strong className="text-emerald-400">{accuracy}%</strong></span>
          <span>Avg Delay: <strong className="text-amber-400">{avgReaction}ms</strong></span>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div
          onClick={handleMiss}
          className="relative h-[340px] w-full max-w-[400px] rounded-2xl border-2 border-cyan-500/30 bg-slate-950 p-4 shadow-2xl overflow-hidden cursor-crosshair"
        >
          {isPlaying &&
            targets.map((target) => (
              <button
                key={target.id}
                onClick={(e) => handleHit(target, e)}
                style={{
                  top: `${target.y}px`,
                  left: `${target.x}px`,
                  width: `${target.size}px`,
                  height: `${target.size}px`,
                }}
                className="absolute flex items-center justify-center rounded-full bg-rose-500 border-4 border-white text-lg font-black text-white shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse transition-transform hover:scale-110 active:scale-95"
              >
                🎯
              </button>
            ))}
        </div>

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">🎉 Session Complete!</p>
            <p className="text-sm text-slate-300">
              Hits: <strong>{hits}</strong> | Accuracy: <strong>{accuracy}%</strong> | Avg: <strong>{avgReaction}ms</strong>
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {isPlaying ? "Restart" : gameOver ? "Play Again" : "Start Aim Test"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
