"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useEffect, useRef, useState, useCallback } from "react";

type Mode = "vs-ai" | "2p-local";
type Difficulty = "easy" | "medium" | "hard";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export default function PongGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<Mode>("vs-ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const { highScore, updateHighScore } = useHighScore("pong", 0);

  const playerPaddleRef = useRef({ x: 20, y: 160, width: 12, height: 80 });
  const p2PaddleRef = useRef({ x: 560, y: 160, width: 12, height: 80 });
  const ballRef = useRef({ x: 300, y: 200, dx: 5, dy: 3, radius: 8 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const createHitParticles = (x: number, y: number, color: string = "#22d3ee") => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color,
      });
    }
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(34, 211, 238, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(
      playerPaddleRef.current.x,
      playerPaddleRef.current.y,
      playerPaddleRef.current.width,
      playerPaddleRef.current.height,
      6
    );
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(
      p2PaddleRef.current.x,
      p2PaddleRef.current.y,
      p2PaddleRef.current.width,
      p2PaddleRef.current.height,
      6
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f43f5e";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const resetBall = useCallback((direction: number = 1) => {
    const baseSpeed = difficulty === "easy" ? 4.5 : difficulty === "medium" ? 6 : 7.5;
    const angle = (Math.random() - 0.5) * (Math.PI / 4);
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: baseSpeed * direction * Math.cos(angle),
      dy: baseSpeed * Math.sin(angle),
      radius: 8,
    };
  }, [difficulty]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;

    let active = true;

    const update = () => {
      if (!active) return;

      const paddleSpeed = 7;
      if (keysRef.current["w"] || keysRef.current["W"] || keysRef.current["ArrowUp"]) {
        playerPaddleRef.current.y = Math.max(0, playerPaddleRef.current.y - paddleSpeed);
      }
      if (keysRef.current["s"] || keysRef.current["S"] || keysRef.current["ArrowDown"]) {
        playerPaddleRef.current.y = Math.min(
          CANVAS_HEIGHT - playerPaddleRef.current.height,
          playerPaddleRef.current.y + paddleSpeed
        );
      }

      if (mode === "2p-local") {
        if (keysRef.current["i"] || keysRef.current["I"]) {
          p2PaddleRef.current.y = Math.max(0, p2PaddleRef.current.y - paddleSpeed);
        }
        if (keysRef.current["k"] || keysRef.current["K"]) {
          p2PaddleRef.current.y = Math.min(
            CANVAS_HEIGHT - p2PaddleRef.current.height,
            p2PaddleRef.current.y + paddleSpeed
          );
        }
      } else {
        const aiSpeed = difficulty === "easy" ? 3.5 : difficulty === "medium" ? 5 : 7;
        const aiCenter = p2PaddleRef.current.y + p2PaddleRef.current.height / 2;
        const targetY = ballRef.current.y;

        if (aiCenter < targetY - 12) {
          p2PaddleRef.current.y = Math.min(
            CANVAS_HEIGHT - p2PaddleRef.current.height,
            p2PaddleRef.current.y + aiSpeed
          );
        } else if (aiCenter > targetY + 12) {
          p2PaddleRef.current.y = Math.max(0, p2PaddleRef.current.y - aiSpeed);
        }
      }

      ballRef.current.x += ballRef.current.dx;
      ballRef.current.y += ballRef.current.dy;

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      if (
        ballRef.current.y - ballRef.current.radius < 0 ||
        ballRef.current.y + ballRef.current.radius > CANVAS_HEIGHT
      ) {
        ballRef.current.dy = -ballRef.current.dy;
        soundManager.playPop();
        createHitParticles(ballRef.current.x, ballRef.current.y, "#22d3ee");
      }

      const p1 = playerPaddleRef.current;
      if (
        ballRef.current.dx < 0 &&
        ballRef.current.x - ballRef.current.radius <= p1.x + p1.width &&
        ballRef.current.x + ballRef.current.radius >= p1.x &&
        ballRef.current.y >= p1.y &&
        ballRef.current.y <= p1.y + p1.height
      ) {
        const hitOffset = (ballRef.current.y - (p1.y + p1.height / 2)) / (p1.height / 2);
        const speed = Math.sqrt(ballRef.current.dx * ballRef.current.dx + ballRef.current.dy * ballRef.current.dy) * 1.05;
        const maxAngle = Math.PI / 3;
        const bounceAngle = hitOffset * maxAngle;

        ballRef.current.dx = Math.abs(speed * Math.cos(bounceAngle));
        ballRef.current.dy = speed * Math.sin(bounceAngle);
        soundManager.playHit();
        createHitParticles(p1.x + p1.width, ballRef.current.y, "#22d3ee");
      }

      const p2 = p2PaddleRef.current;
      if (
        ballRef.current.dx > 0 &&
        ballRef.current.x + ballRef.current.radius >= p2.x &&
        ballRef.current.x - ballRef.current.radius <= p2.x + p2.width &&
        ballRef.current.y >= p2.y &&
        ballRef.current.y <= p2.y + p2.height
      ) {
        const hitOffset = (ballRef.current.y - (p2.y + p2.height / 2)) / (p2.height / 2);
        const speed = Math.sqrt(ballRef.current.dx * ballRef.current.dx + ballRef.current.dy * ballRef.current.dy) * 1.05;
        const maxAngle = Math.PI / 3;
        const bounceAngle = hitOffset * maxAngle;

        ballRef.current.dx = -Math.abs(speed * Math.cos(bounceAngle));
        ballRef.current.dy = speed * Math.sin(bounceAngle);
        soundManager.playHit();
        createHitParticles(p2.x, ballRef.current.y, "#f43f5e");
      }

      if (ballRef.current.x < 0) {
        soundManager.playExplosion();
        setAiScore((prev) => prev + 1);
        resetBall(1);
      } else if (ballRef.current.x > CANVAS_WIDTH) {
        soundManager.playSuccess();
        setPlayerScore((prev) => {
          const next = prev + 1;
          updateHighScore(next);
          return next;
        });
        resetBall(-1);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx);
      }

      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, mode, difficulty, resetBall, draw, updateHighScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setPlayerScore(0);
    setAiScore(0);
    playerPaddleRef.current = { x: 20, y: 160, width: 12, height: 80 };
    p2PaddleRef.current = { x: 560, y: 160, width: 12, height: 80 };
    resetBall(1);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    playerPaddleRef.current.y = Math.max(
      0,
      Math.min(CANVAS_HEIGHT - playerPaddleRef.current.height, touchY - playerPaddleRef.current.height / 2)
    );
  };

  return (
    <GameShell
      title="Pong Battle"
      description="Classic paddle battle! Spin the ball with angle deflections and challenge AI or local 2-Player."
      icon="🏓"
      score={playerScore}
      highScore={highScore}
      scoreLabel={mode === "vs-ai" ? "Player" : "P1"}
      highScoreLabel="Best Wins"
      isPlaying={isPlaying}
      isPaused={isPaused}
      onPauseToggle={() => setIsPaused(!isPaused)}
      howToPlayText="Control your paddle using W/S or Arrow Keys (or drag on touchscreens). In 2-Player mode, P2 uses I/K keys. Hitting the ball near the paddle edge applies sharp curve angles!"
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
            <button
              onClick={() => setMode("vs-ai")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "vs-ai" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              1P vs AI
            </button>
            <button
              onClick={() => setMode("2p-local")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "2p-local" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              2P Local
            </button>
          </div>

          {mode === "vs-ai" && (
            <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase ${
                    difficulty === d ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      }
      mobileControls={{
        onUp: () => {
          playerPaddleRef.current.y = Math.max(0, playerPaddleRef.current.y - 24);
        },
        onDown: () => {
          playerPaddleRef.current.y = Math.min(
            CANVAS_HEIGHT - playerPaddleRef.current.height,
            playerPaddleRef.current.y + 24
          );
        },
      }}
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 flex items-center justify-around w-full max-w-md px-6 text-xl font-bold text-cyan-200">
          <span>{mode === "vs-ai" ? "Player: " : "P1: "} {playerScore}</span>
          <span>{mode === "vs-ai" ? `AI (${difficulty}): ` : "P2: "} {aiScore}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onTouchMove={handleTouchMove}
          className="max-w-full rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-2xl [touch-action:none]"
        />

        <div className="mt-6 flex gap-4">
          {!isPlaying ? (
            <button
              onClick={startGame}
              className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
            >
              Start Match
            </button>
          ) : (
            <button
              onClick={() => setIsPlaying(false)}
              className="rounded-2xl bg-rose-600 px-8 py-3 text-base font-semibold text-white hover:bg-rose-500"
            >
              Stop Game
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
