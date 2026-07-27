"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.38;
const JUMP = -6.8;

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export default function FlappyBirdGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { highScore, updateHighScore } = useHighScore("flappy_bird", 0);

  const birdRef = useRef({ x: 80, y: 220, velocity: 0, radius: 12 });
  const pipesRef = useRef<Pipe[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const spawnPipe = useCallback((xOffset: number = CANVAS_WIDTH) => {
    const gap = 125;
    const minHeight = 50;
    const maxHeight = CANVAS_HEIGHT - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const bottomHeight = CANVAS_HEIGHT - topHeight - gap;
    pipesRef.current.push({ x: xOffset, topHeight, bottomHeight, passed: false });
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying || isPaused || gameOver) return;
    birdRef.current.velocity = JUMP;
    soundManager.playPop();
  }, [isPlaying, isPaused, gameOver]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Pipes
    pipesRef.current.forEach((pipe) => {
      ctx.fillStyle = "#34d399";
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 8;
      // Top Pipe
      ctx.fillRect(pipe.x, 0, 52, pipe.topHeight);
      // Bottom Pipe
      ctx.fillRect(pipe.x, CANVAS_HEIGHT - pipe.bottomHeight, 52, pipe.bottomHeight);
      ctx.shadowBlur = 0;
    });

    // Draw Bird
    const bird = birdRef.current;
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    let active = true;

    const update = () => {
      if (!active) return;

      const bird = birdRef.current;
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;

      // Pipe Movement & Spawning
      pipesRef.current.forEach((pipe) => {
        pipe.x -= 2.8;

        if (!pipe.passed && pipe.x + 52 < bird.x) {
          pipe.passed = true;
          soundManager.playSuccess();
          setScore((prev) => {
            const next = prev + 1;
            updateHighScore(next);
            return next;
          });
        }
      });

      if (pipesRef.current.length > 0 && pipesRef.current[0].x < -60) {
        pipesRef.current.shift();
      }

      if (pipesRef.current.length === 0 || pipesRef.current[pipesRef.current.length - 1].x < CANVAS_WIDTH - 200) {
        spawnPipe(CANVAS_WIDTH);
      }

      // Collision Check
      if (bird.y + bird.radius > CANVAS_HEIGHT || bird.y - bird.radius < 0) {
        setGameOver(true);
        setIsPlaying(false);
        soundManager.playGameOver();
        return;
      }

      pipesRef.current.forEach((pipe) => {
        if (
          bird.x + bird.radius > pipe.x &&
          bird.x - bird.radius < pipe.x + 52 &&
          (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > CANVAS_HEIGHT - pipe.bottomHeight)
        ) {
          setGameOver(true);
          setIsPlaying(false);
          soundManager.playGameOver();
          return;
        }
      });

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
  }, [isPlaying, isPaused, gameOver, draw, spawnPipe, updateHighScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jump]);

  const startGame = () => {
    birdRef.current = { x: 80, y: 220, velocity: 0, radius: 12 };
    pipesRef.current = [];
    spawnPipe(CANVAS_WIDTH + 50);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
  };

  return (
    <GameShell
      title="Flappy Bird"
      description="Tap or press Spacebar to flap your wings and dodge obstacles!"
      icon="🐦"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      isPaused={isPaused}
      onPauseToggle={() => setIsPaused(!isPaused)}
      howToPlayText="Press Spacebar, click, or tap the screen to make Flappy Bird flap upwards. Pass through pipe gaps to score points!"
      mobileControls={{
        onAction: jump,
        actionLabel: "FLAP 🐦",
      }}
    >
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          className="max-w-full rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-2xl [touch-action:none]"
        />

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <p className="text-xl font-bold text-rose-400">💥 Crash Landing!</p>
            <p className="text-sm text-slate-300">Final Score: {score}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {!isPlaying ? (
            <button
              onClick={startGame}
              className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
            >
              {gameOver ? "Play Again" : "Start Flapping"}
            </button>
          ) : (
            <button
              onClick={jump}
              className="rounded-2xl bg-cyan-400 px-8 py-3 text-base font-bold text-slate-950 transition-all hover:bg-cyan-300"
            >
              FLAP! (Space)
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
