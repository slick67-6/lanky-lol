"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useEffect, useRef, useState } from "react";

export default function BreakoutGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const paddleRef = useRef({ x: 0, width: 80, height: 10 });
  const ballRef = useRef({ x: 0, y: 0, dx: 4, dy: -4, radius: 8 });
  const bricksRef = useRef<{ x: number; y: number; status: boolean }[]>([]);
  const gameLoopRef = useRef<number>();

  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 400;
  const BRICK_ROWS = 5;
  const BRICK_COLS = 8;
  const BRICK_WIDTH = 50;
  const BRICK_HEIGHT = 20;
  const BRICK_PADDING = 10;
  const BRICK_OFFSET_TOP = 30;
  const BRICK_OFFSET_LEFT = 35;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    initializeBricks();
    paddleRef.current.x = (CANVAS_WIDTH - paddleRef.current.width) / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 4,
      dy: -4,
      radius: 8,
    };

    draw(ctx);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      if (e.key === "ArrowLeft" || e.key === "a") {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - 20);
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        paddleRef.current.x = Math.min(
          CANVAS_WIDTH - paddleRef.current.width,
          paddleRef.current.x + 20
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver]);

  const initializeBricks = () => {
    const bricks: { x: number; y: number; status: boolean }[] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          status: true,
        });
      }
    }
    bricksRef.current = bricks;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bricks
    bricksRef.current.forEach((brick) => {
      if (brick.status) {
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 5;
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.shadowBlur = 0;
      }
    });

    // Draw paddle
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.fillRect(
      paddleRef.current.x,
      CANVAS_HEIGHT - paddleRef.current.height - 10,
      paddleRef.current.width,
      paddleRef.current.height
    );
    ctx.shadowBlur = 0;

    // Draw ball
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Move ball
    ballRef.current.x += ballRef.current.dx;
    ballRef.current.y += ballRef.current.dy;

    // Wall collision
    if (ballRef.current.x + ballRef.current.radius > CANVAS_WIDTH || ballRef.current.x - ballRef.current.radius < 0) {
      ballRef.current.dx = -ballRef.current.dx;
    }
    if (ballRef.current.y - ballRef.current.radius < 0) {
      ballRef.current.dy = -ballRef.current.dy;
    }

    // Paddle collision
    if (
      ballRef.current.y + ballRef.current.radius > CANVAS_HEIGHT - paddleRef.current.height - 10 &&
      ballRef.current.x > paddleRef.current.x &&
      ballRef.current.x < paddleRef.current.x + paddleRef.current.width
    ) {
      ballRef.current.dy = -ballRef.current.dy;
    }

    // Bottom collision (game over)
    if (ballRef.current.y + ballRef.current.radius > CANVAS_HEIGHT) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) setHighScore(score);
      return;
    }

    // Brick collision
    bricksRef.current.forEach((brick) => {
      if (brick.status) {
        if (
          ballRef.current.x > brick.x &&
          ballRef.current.x < brick.x + BRICK_WIDTH &&
          ballRef.current.y > brick.y &&
          ballRef.current.y < brick.y + BRICK_HEIGHT
        ) {
          ballRef.current.dy = -ballRef.current.dy;
          brick.status = false;
          setScore((prev) => prev + 10);
        }
      }
    });

    // Check win condition
    if (bricksRef.current.every((brick) => !brick.status)) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) setHighScore(score);
    }

    draw(ctx);
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    initializeBricks();
    paddleRef.current.x = (CANVAS_WIDTH - paddleRef.current.width) / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 4,
      dy: -4,
      radius: 8,
    };
    setScore(0);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    draw(ctx);

    gameLoopRef.current = window.setInterval(update, 16);
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
    initializeBricks();
    paddleRef.current.x = (CANVAS_WIDTH - paddleRef.current.width) / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 4,
      dy: -4,
      radius: 8,
    };

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
        <SiteHeader title="Breakout" />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🧱 Breakout
            </h1>
            <p className="mb-8 text-slate-400">
              Break all the bricks with the ball. Don't let it drop!
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
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
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
                <span className="rounded border border-slate-700 px-3 py-1">← → or A D</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
