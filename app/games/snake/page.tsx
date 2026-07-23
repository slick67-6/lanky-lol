"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useEffect, useRef, useState } from "react";

export default function SnakeGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const snakeRef = useRef<{ x: number; y: number }[]>([]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const directionRef = useRef({ x: 1, y: 0 });
  const gameLoopRef = useRef<number | null>(null);

  const GRID_SIZE = 20;
  const CANVAS_SIZE = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize snake
    snakeRef.current = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameOver(false);
    spawnFood();

    // Draw initial state
    draw(ctx);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (directionRef.current.y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case "ArrowDown":
          e.preventDefault();
          if (directionRef.current.y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (directionRef.current.x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case "ArrowRight":
          e.preventDefault();
          if (directionRef.current.x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver]);

  const spawnFood = () => {
    const x = Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE));
    const y = Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE));
    foodRef.current = { x, y };
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
    ctx.strokeStyle = "#1e293b";
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

    // Draw food
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
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

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? "#22d3ee" : "#0891b2";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = index === 0 ? 10 : 0;
      ctx.fillRect(
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      );
    });
    ctx.shadowBlur = 0;
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Move snake
    const head = {
      x: snakeRef.current[0].x + directionRef.current.x,
      y: snakeRef.current[0].y + directionRef.current.y,
    };

    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= CANVAS_SIZE / GRID_SIZE ||
      head.y < 0 ||
      head.y >= CANVAS_SIZE / GRID_SIZE
    ) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) setHighScore(score);
      return;
    }

    // Check self collision
    if (snakeRef.current.some((segment) => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) setHighScore(score);
      return;
    }

    snakeRef.current.unshift(head);

    // Check food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore((prev) => prev + 10);
      spawnFood();
    } else {
      snakeRef.current.pop();
    }

    draw(ctx);
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    snakeRef.current = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    spawnFood();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    draw(ctx);

    gameLoopRef.current = window.setInterval(update, 100);
  };

  const stopGame = () => {
    setIsPlaying(false);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  };

  const resetGame = () => {
    stopGame();
    setGameOver(false);
    setScore(0);
    snakeRef.current = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
    ];
    directionRef.current = { x: 1, y: 0 };
    spawnFood();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    draw(ctx);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Snake Classic" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🐍 Snake Classic
            </h1>
            <p className="mb-8 text-slate-400">
              Use arrow keys to control the snake. Eat food to grow longer. Avoid walls and yourself!
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-2xl font-bold text-cyan-100">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">High Score</p>
                <p className="text-2xl font-bold text-cyan-100">{highScore}</p>
              </div>
            </div>

            <div className="mb-6 flex justify-center">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="rounded-xl border-2 border-cyan-500/30 bg-slate-950"
              />
            </div>

            {gameOver && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 p-4">
                <p className="text-lg font-semibold text-red-400">Game Over!</p>
                <p className="text-slate-400">Final Score: {score}</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  {gameOver ? "Play Again" : "Start Game"}
                </button>
              ) : (
                <button
                  onClick={stopGame}
                  className="rounded-xl bg-rose-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  Stop Game
                </button>
              )}
              <button
                onClick={resetGame}
                className="rounded-xl border border-cyan-500/30 px-8 py-3 text-base font-medium text-cyan-300 transition-colors hover:bg-cyan-950/40"
              >
                Reset
              </button>
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">Controls:</p>
              <div className="flex justify-center gap-4">
                <span className="rounded border border-slate-700 px-3 py-1">↑ ↓ ← →</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
