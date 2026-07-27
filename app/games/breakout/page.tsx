"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useEffect, useRef, useState, useCallback } from "react";

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: boolean;
  color: string;
}

interface PowerUp {
  x: number;
  y: number;
  type: "expand" | "extra-life" | "multiball";
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 420;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 8;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 12;

const ROW_COLORS = ["#f43f5e", "#fb923c", "#fbbf24", "#34d399", "#22d3ee"];

export default function BreakoutGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { highScore, updateHighScore } = useHighScore("breakout", 0);

  const paddleRef = useRef({ x: 200, width: 90, height: 12 });
  const ballsRef = useRef<{ x: number; y: number; dx: number; dy: number; radius: number }[]>([
    { x: 240, y: 350, dx: 4, dy: -4, radius: 7 },
  ]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initializeBricks = useCallback(() => {
    const bricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          status: true,
          color: ROW_COLORS[r % ROW_COLORS.length],
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1.0,
        color,
      });
    }
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    bricksRef.current.forEach((b) => {
      if (b.status) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, b.height, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    powerUpsRef.current.forEach((p) => {
      if (p.active) {
        ctx.fillStyle = p.type === "expand" ? "#34d399" : p.type === "extra-life" ? "#f43f5e" : "#a855f7";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const p = paddleRef.current;
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(p.x, CANVAS_HEIGHT - p.height - 10, p.width, p.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ballsRef.current.forEach((ball) => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, []);

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    let active = true;

    const update = () => {
      if (!active) return;

      const paddleSpeed = 8;
      if (keysRef.current["ArrowLeft"] || keysRef.current["a"] || keysRef.current["A"]) {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - paddleSpeed);
      }
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) {
        paddleRef.current.x = Math.min(
          CANVAS_WIDTH - paddleRef.current.width,
          paddleRef.current.x + paddleSpeed
        );
      }

      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 0.04;
      });
      particlesRef.current = particlesRef.current.filter((pt) => pt.life > 0);

      powerUpsRef.current.forEach((pw) => {
        if (pw.active) {
          pw.y += 2.5;
          const paddleY = CANVAS_HEIGHT - paddleRef.current.height - 10;
          if (
            pw.y >= paddleY &&
            pw.x >= paddleRef.current.x &&
            pw.x <= paddleRef.current.x + paddleRef.current.width
          ) {
            pw.active = false;
            soundManager.playPowerup();
            if (pw.type === "expand") {
              paddleRef.current.width = Math.min(150, paddleRef.current.width + 30);
            } else if (pw.type === "extra-life") {
              setLives((l) => l + 1);
            } else if (pw.type === "multiball" && ballsRef.current.length > 0) {
              const b = ballsRef.current[0];
              ballsRef.current.push({ x: b.x, y: b.y, dx: -b.dx, dy: b.dy, radius: b.radius });
            }
          }
        }
      });

      ballsRef.current.forEach((ball) => {
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) {
          ball.dx = -ball.dx;
          soundManager.playPop();
        }
        if (ball.y - ball.radius < 0) {
          ball.dy = -ball.dy;
          soundManager.playPop();
        }

        const paddleY = CANVAS_HEIGHT - paddleRef.current.height - 10;
        if (
          ball.dy > 0 &&
          ball.y + ball.radius >= paddleY &&
          ball.x >= paddleRef.current.x &&
          ball.x <= paddleRef.current.x + paddleRef.current.width
        ) {
          const hitOffset = (ball.x - (paddleRef.current.x + paddleRef.current.width / 2)) / (paddleRef.current.width / 2);
          const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
          const maxAngle = (5 * Math.PI) / 12;
          const bounceAngle = hitOffset * maxAngle;

          ball.dx = speed * Math.sin(bounceAngle);
          ball.dy = -speed * Math.cos(bounceAngle);
          soundManager.playHit();
          setCombo(1);
        }

        bricksRef.current.forEach((brick) => {
          if (brick.status) {
            if (
              ball.x + ball.radius > brick.x &&
              ball.x - ball.radius < brick.x + brick.width &&
              ball.y + ball.radius > brick.y &&
              ball.y - ball.radius < brick.y + brick.height
            ) {
              brick.status = false;
              ball.dy = -ball.dy;

              createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
              soundManager.playBlip();

              setCombo((c) => {
                const nextCombo = c + 1;
                if (nextCombo > 2) soundManager.playCombo();
                setScore((s) => {
                  const added = 10 * nextCombo;
                  const nextScore = s + added;
                  updateHighScore(nextScore);
                  return nextScore;
                });
                return nextCombo;
              });

              if (Math.random() < 0.25) {
                const types: ("expand" | "extra-life" | "multiball")[] = ["expand", "extra-life", "multiball"];
                powerUpsRef.current.push({
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height / 2,
                  type: types[Math.floor(Math.random() * types.length)],
                  active: true,
                });
              }
            }
          }
        });
      });

      ballsRef.current = ballsRef.current.filter((b) => b.y - b.radius < CANVAS_HEIGHT);

      if (ballsRef.current.length === 0) {
        soundManager.playExplosion();
        setLives((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            setIsPlaying(false);
            soundManager.playGameOver();
            return 0;
          } else {
            ballsRef.current = [
              {
                x: paddleRef.current.x + paddleRef.current.width / 2,
                y: CANVAS_HEIGHT - 35,
                dx: 4,
                dy: -4,
                radius: 7,
              },
            ];
            return prev - 1;
          }
        });
      }

      if (bricksRef.current.every((b) => !b.status)) {
        setWon(true);
        setGameOver(true);
        setIsPlaying(false);
        soundManager.playWin();
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
  }, [isPlaying, isPaused, gameOver, draw, updateHighScore]);

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
    setGameOver(false);
    setWon(false);
    setScore(0);
    setLives(3);
    setCombo(1);
    paddleRef.current = { x: 200, width: 90, height: 12 };
    ballsRef.current = [{ x: 240, y: 350, dx: 4, dy: -4, radius: 7 }];
    powerUpsRef.current = [];
    particlesRef.current = [];
    initializeBricks();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddleRef.current.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - paddleRef.current.width, mouseX - paddleRef.current.width / 2)
    );
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    paddleRef.current.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - paddleRef.current.width, touchX - paddleRef.current.width / 2)
    );
  };

  return (
    <GameShell
      title="Breakout"
      description="Break all bricks, collect powerups, build up combo multipliers, and conquer the stage!"
      icon="🧱"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      isPaused={isPaused}
      onPauseToggle={() => setIsPaused(!isPaused)}
      howToPlayText="Use Arrow Keys, A/D, or mouse/touch drag to move the paddle. Hitting multiple bricks without bouncing off the paddle builds your combo multiplier. Catch glowing falling orbs for powerups!"
      customControls={
        <div className="flex items-center gap-6 text-sm font-semibold text-cyan-200">
          <span>Lives: {"❤️".repeat(lives)}</span>
          <span>Combo: <span className="text-amber-400 font-bold">{combo}x</span></span>
        </div>
      }
      mobileControls={{
        onLeft: () => {
          paddleRef.current.x = Math.max(0, paddleRef.current.x - 30);
        },
        onRight: () => {
          paddleRef.current.x = Math.min(
            CANVAS_WIDTH - paddleRef.current.width,
            paddleRef.current.x + 30
          );
        },
      }}
    >
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="max-w-full rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-2xl [touch-action:none]"
        />

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              {won ? "🎉 Stage Cleared!" : "💥 Game Over!"}
            </p>
            <p className="text-sm text-slate-300">Final Score: {score}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {!isPlaying ? (
            <button
              onClick={startGame}
              className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
            >
              {gameOver ? "Play Again" : "Start Game"}
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
