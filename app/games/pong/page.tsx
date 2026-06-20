"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { OnlineMatchmakingPanel } from "@/components/online-matchmaking-panel";
import { SiteHeader } from "@/components/site-header";
import { useEffect, useRef, useState } from "react";

export default function PongGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerPaddleRef = useRef({ x: 0, y: 0, width: 10, height: 80 });
  const aiPaddleRef = useRef({ x: 0, y: 0, width: 10, height: 80 });
  const ballRef = useRef({ x: 0, y: 0, dx: 5, dy: 5, radius: 8 });
  const gameLoopRef = useRef<number | null>(null);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    playerPaddleRef.current = { x: 20, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    aiPaddleRef.current = { x: CANVAS_WIDTH - 30, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    ballRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: 5, dy: 5, radius: 8 };

    draw(ctx);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;

      if (e.key === "ArrowUp" || e.key === "w") {
        playerPaddleRef.current.y = Math.max(0, playerPaddleRef.current.y - 20);
      }
      if (e.key === "ArrowDown" || e.key === "s") {
        playerPaddleRef.current.y = Math.min(
          CANVAS_HEIGHT - playerPaddleRef.current.height,
          playerPaddleRef.current.y + 20
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.fillRect(
      playerPaddleRef.current.x,
      playerPaddleRef.current.y,
      playerPaddleRef.current.width,
      playerPaddleRef.current.height
    );
    ctx.fillRect(
      aiPaddleRef.current.x,
      aiPaddleRef.current.y,
      aiPaddleRef.current.width,
      aiPaddleRef.current.height
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

    // Wall collision (top/bottom)
    if (ballRef.current.y - ballRef.current.radius < 0 || ballRef.current.y + ballRef.current.radius > CANVAS_HEIGHT) {
      ballRef.current.dy = -ballRef.current.dy;
    }

    // Paddle collision
    if (
      ballRef.current.x - ballRef.current.radius < playerPaddleRef.current.x + playerPaddleRef.current.width &&
      ballRef.current.y > playerPaddleRef.current.y &&
      ballRef.current.y < playerPaddleRef.current.y + playerPaddleRef.current.height
    ) {
      ballRef.current.dx = Math.abs(ballRef.current.dx);
    }

    if (
      ballRef.current.x + ballRef.current.radius > aiPaddleRef.current.x &&
      ballRef.current.y > aiPaddleRef.current.y &&
      ballRef.current.y < aiPaddleRef.current.y + aiPaddleRef.current.height
    ) {
      ballRef.current.dx = -Math.abs(ballRef.current.dx);
    }

    // AI paddle movement
    const aiCenter = aiPaddleRef.current.y + aiPaddleRef.current.height / 2;
    if (aiCenter < ballRef.current.y - 20) {
      aiPaddleRef.current.y = Math.min(
        CANVAS_HEIGHT - aiPaddleRef.current.height,
        aiPaddleRef.current.y + 4
      );
    } else if (aiCenter > ballRef.current.y + 20) {
      aiPaddleRef.current.y = Math.max(0, aiPaddleRef.current.y - 4);
    }

    // Score
    if (ballRef.current.x < 0) {
      setAiScore((prev) => prev + 1);
      resetBall();
    }
    if (ballRef.current.x > CANVAS_WIDTH) {
      setPlayerScore((prev) => prev + 1);
      resetBall();
    }

    draw(ctx);
  };

  const resetBall = () => {
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: 5 * (Math.random() > 0.5 ? 1 : -1),
      dy: 5 * (Math.random() > 0.5 ? 1 : -1),
      radius: 8,
    };
  };

  const startGame = () => {
    setIsPlaying(true);
    setPlayerScore(0);
    setAiScore(0);
    playerPaddleRef.current = { x: 20, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    aiPaddleRef.current = { x: CANVAS_WIDTH - 30, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    resetBall();

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
    setPlayerScore(0);
    setAiScore(0);
    playerPaddleRef.current = { x: 20, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    aiPaddleRef.current = { x: CANVAS_WIDTH - 30, y: CANVAS_HEIGHT / 2 - 40, width: 10, height: 80 };
    resetBall();

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
        <SiteHeader title="Pong Battle" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🏓 Pong Battle
            </h1>
            <p className="mb-8 text-slate-400">
              Classic paddle game. Compete against AI!
            </p>

            <OnlineMatchmakingPanel gameName="Pong" />

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Player</p>
                <p className="text-2xl font-bold text-cyan-100">{playerScore}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">AI</p>
                <p className="text-2xl font-bold text-cyan-100">{aiScore}</p>
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

            <div className="flex justify-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  Start Game
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
                <span className="rounded border border-slate-700 px-3 py-1">↑ ↓ or W S</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
