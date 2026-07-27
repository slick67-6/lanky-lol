"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useEffect, useRef, useState, useCallback } from "react";

type Theme = "cyber" | "emerald" | "sunset";

const THEMES: Record<Theme, { snakeHead: string; snakeBody: string; food: string; bg: string }> = {
  cyber: { snakeHead: "#22d3ee", snakeBody: "#0891b2", food: "#f43f5e", bg: "#030712" },
  emerald: { snakeHead: "#34d399", snakeBody: "#059669", food: "#fbbf24", bg: "#022c22" },
  sunset: { snakeHead: "#fb923c", snakeBody: "#ea580c", food: "#a855f7", bg: "#1c1917" },
};

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;

export default function SnakeGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>("cyber");

  const { highScore, updateHighScore } = useHighScore("snake", 0);

  const snakeRef = useRef<{ x: number; y: number }[]>([
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 10, y: 10 });
  const directionRef = useRef({ x: 1, y: 0 });
  const directionQueueRef = useRef<{ x: number; y: number }[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const gameStateRef = useRef({ isPlaying, isPaused, gameOver, score, theme });

  useEffect(() => {
    gameStateRef.current = { isPlaying, isPaused, gameOver, score, theme };
  }, [isPlaying, isPaused, gameOver, score, theme]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, currentTheme: Theme) => {
    const palette = THEMES[currentTheme];
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    ctx.fillStyle = palette.food;
    ctx.shadowColor = palette.food;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? palette.snakeHead : palette.snakeBody;
      ctx.shadowColor = index === 0 ? palette.snakeHead : "transparent";
      ctx.shadowBlur = index === 0 ? 10 : 0;

      ctx.beginPath();
      const radius = index === 0 ? 6 : 4;
      ctx.roundRect(
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2,
        radius
      );
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, []);

  const spawnFood = useCallback(() => {
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE));
      y = Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE));
    } while (snakeRef.current.some((seg) => seg.x === x && seg.y === y));
    foodRef.current = { x, y };
  }, []);

  const handleDirectionChange = useCallback((dir: { x: number; y: number }) => {
    const currentDir = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : directionRef.current;

    if (dir.x !== 0 && currentDir.x !== -dir.x) {
      directionQueueRef.current.push(dir);
    } else if (dir.y !== 0 && currentDir.y !== -dir.y) {
      directionQueueRef.current.push(dir);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    let active = true;

    const tick = (timestamp: number) => {
      if (!active) return;

      const currentScore = gameStateRef.current.score;
      const speed = Math.max(50, 110 - Math.floor(currentScore / 30) * 8);

      if (timestamp - lastTickTimeRef.current >= speed) {
        lastTickTimeRef.current = timestamp;

        if (directionQueueRef.current.length > 0) {
          directionRef.current = directionQueueRef.current.shift()!;
        }

        const head = {
          x: snakeRef.current[0].x + directionRef.current.x,
          y: snakeRef.current[0].y + directionRef.current.y,
        };

        if (
          head.x < 0 ||
          head.x >= CANVAS_SIZE / GRID_SIZE ||
          head.y < 0 ||
          head.y >= CANVAS_SIZE / GRID_SIZE ||
          snakeRef.current.some((segment) => segment.x === head.x && segment.y === head.y)
        ) {
          setGameOver(true);
          setIsPlaying(false);
          soundManager.playGameOver();
          updateHighScore(currentScore);
          return;
        }

        snakeRef.current.unshift(head);

        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
          soundManager.playPop();
          setScore((prev) => {
            const next = prev + 10;
            updateHighScore(next);
            return next;
          });
          spawnFood();
        } else {
          snakeRef.current.pop();
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) draw(ctx, gameStateRef.current.theme);
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, gameOver, draw, spawnFood, updateHighScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver || isPaused) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          handleDirectionChange({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          handleDirectionChange({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          handleDirectionChange({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          handleDirectionChange({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver, isPaused, handleDirectionChange]);

  const startCountdown = () => {
    snakeRef.current = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    directionQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    spawnFood();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) draw(ctx, theme);
    }

    setCountdown(3);
    soundManager.playBlip();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setIsPlaying(true);
          soundManager.playSuccess();
          return null;
        }
        soundManager.playBlip();
        return prev - 1;
      });
    }, 700);
  };

  const togglePause = () => {
    if (!isPlaying || gameOver) return;
    setIsPaused((prev) => !prev);
  };

  return (
    <GameShell
      title="Snake Classic"
      description="Queue turns smoothly, grow longer, speed up, and set new high scores!"
      icon="🐍"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      isPaused={isPaused}
      onPauseToggle={togglePause}
      howToPlayText="Use Arrow Keys or WASD (or on-screen D-Pad) to control the snake. Eat red food targets to gain 10 points and grow longer. As your score increases, the snake speeds up! Avoid running into the walls or your own tail."
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-400">Theme:</span>
          {(["cyber", "emerald", "sunset"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t);
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext("2d");
                  if (ctx) draw(ctx, t);
                }
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                theme === t
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
      mobileControls={{
        onUp: () => handleDirectionChange({ x: 0, y: -1 }),
        onDown: () => handleDirectionChange({ x: 0, y: 1 }),
        onLeft: () => handleDirectionChange({ x: -1, y: 0 }),
        onRight: () => handleDirectionChange({ x: 1, y: 0 }),
      }}
    >
      <div className="relative flex flex-col items-center">
        {countdown !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <span className="text-6xl font-black text-cyan-300 animate-bounce">{countdown}</span>
            <span className="mt-2 text-sm font-semibold uppercase tracking-widest text-cyan-100">Get Ready!</span>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <span className="text-4xl font-bold text-cyan-200">⏸ GAME PAUSED</span>
            <button
              onClick={togglePause}
              className="mt-4 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Resume
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="max-w-full rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-2xl"
        />

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <p className="text-lg font-bold text-rose-400">💥 Game Over!</p>
            <p className="text-sm text-slate-300">Final Score: {score}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {!isPlaying || gameOver ? (
            <button
              onClick={startCountdown}
              className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
            >
              {gameOver ? "Play Again" : "Start Game"}
            </button>
          ) : (
            <button
              onClick={() => setIsPlaying(false)}
              className="rounded-2xl bg-rose-600 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-rose-500"
            >
              Stop Game
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
