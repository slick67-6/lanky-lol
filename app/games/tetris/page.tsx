"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: "#22d3ee" },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: "#3b82f6" },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: "#f97316" },
  O: { shape: [[1, 1], [1, 1]], color: "#eab308" },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: "#22c55e" },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: "#a855f7" },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: "#ef4444" },
};

type TetrominoKey = keyof typeof TETROMINOES;

function getRandomTetromino(): { shape: number[][]; color: string } {
  const keys = Object.keys(TETROMINOES) as TetrominoKey[];
  const randKey = keys[Math.floor(Math.random() * keys.length)];
  return TETROMINOES[randKey];
}

function createEmptyGrid(): string[][] {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(""));
}

export default function TetrisGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { highScore, updateHighScore } = useHighScore("tetris", 0);

  const gridRef = useRef<string[][]>(createEmptyGrid());
  const currentPieceRef = useRef<{ shape: number[][]; color: string; x: number; y: number }>({
    shape: [],
    color: "",
    x: 3,
    y: 0,
  });
  const animFrameRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK_SIZE);
      ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK_SIZE, 0);
      ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      ctx.stroke();
    }

    gridRef.current.forEach((row, r) => {
      row.forEach((color, c) => {
        if (color) {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    });

    const piece = currentPieceRef.current;
    if (piece.shape.length > 0) {
      ctx.fillStyle = piece.color;
      ctx.shadowColor = piece.color;
      ctx.shadowBlur = 10;
      piece.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val) {
            ctx.beginPath();
            ctx.roundRect(
              (piece.x + c) * BLOCK_SIZE + 1,
              (piece.y + r) * BLOCK_SIZE + 1,
              BLOCK_SIZE - 2,
              BLOCK_SIZE - 2,
              4
            );
            ctx.fill();
          }
        });
      });
      ctx.shadowBlur = 0;
    }
  }, []);

  const collide = (piece: { shape: number[][]; x: number; y: number }, grid: string[][]): boolean => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const newX = piece.x + c;
          const newY = piece.y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const spawnPiece = useCallback(() => {
    const next = getRandomTetromino();
    currentPieceRef.current = {
      shape: next.shape,
      color: next.color,
      x: Math.floor((COLS - next.shape[0].length) / 2),
      y: 0,
    };

    if (collide(currentPieceRef.current, gridRef.current)) {
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playGameOver();
    }
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!isPlaying || isPaused || gameOver) return false;
    const p = currentPieceRef.current;
    const test = { ...p, x: p.x + dx, y: p.y + dy };
    if (!collide(test, gridRef.current)) {
      p.x += dx;
      p.y += dy;
      soundManager.playPop();
      return true;
    }
    return false;
  }, [isPlaying, isPaused, gameOver]);

  const rotatePiece = useCallback(() => {
    if (!isPlaying || isPaused || gameOver) return;
    const p = currentPieceRef.current;
    const rotated = p.shape[0].map((_, index) => p.shape.map((row) => row[index]).reverse());
    const test = { ...p, shape: rotated };
    if (!collide(test, gridRef.current)) {
      p.shape = rotated;
      soundManager.playBlip();
    }
  }, [isPlaying, isPaused, gameOver]);

  const hardDrop = useCallback(() => {
    if (!isPlaying || isPaused || gameOver) return;
    while (movePiece(0, 1)) {}
    soundManager.playHit();
  }, [isPlaying, isPaused, gameOver, movePiece]);

  const lockPieceAndClearLines = useCallback(() => {
    const p = currentPieceRef.current;
    p.shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const gy = p.y + r;
          const gx = p.x + c;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            gridRef.current[gy][gx] = p.color;
          }
        }
      });
    });

    let cleared = 0;
    const newGrid: string[][] = [];

    for (let r = 0; r < ROWS; r++) {
      if (gridRef.current[r].every((cell) => cell !== "")) {
        cleared++;
      } else {
        newGrid.push(gridRef.current[r]);
      }
    }

    while (newGrid.length < ROWS) {
      newGrid.unshift(Array(COLS).fill(""));
    }

    gridRef.current = newGrid;

    if (cleared > 0) {
      soundManager.playCombo();
      const linePoints = [0, 100, 300, 500, 800];
      const pts = linePoints[cleared] || 1000;
      setLinesCleared((l) => l + cleared);
      setScore((prev) => {
        const next = prev + pts;
        updateHighScore(next);
        return next;
      });
    }

    spawnPiece();
  }, [spawnPiece, updateHighScore]);

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    let active = true;

    const update = (timestamp: number) => {
      if (!active) return;

      const dropInterval = Math.max(100, 600 - Math.floor(linesCleared / 10) * 50);

      if (timestamp - lastDropTimeRef.current >= dropInterval) {
        lastDropTimeRef.current = timestamp;
        const p = currentPieceRef.current;
        const test = { ...p, y: p.y + 1 };
        if (!collide(test, gridRef.current)) {
          p.y += 1;
        } else {
          lockPieceAndClearLines();
        }
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
  }, [isPlaying, isPaused, gameOver, linesCleared, draw, lockPieceAndClearLines]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || gameOver) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          movePiece(1, 0);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          movePiece(0, 1);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          rotatePiece();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isPaused, gameOver, movePiece, rotatePiece, hardDrop]);

  const startGame = () => {
    gridRef.current = createEmptyGrid();
    setScore(0);
    setLinesCleared(0);
    setGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    spawnPiece();
  };

  return (
    <GameShell
      title="Tetris"
      description="Classic block-stacking puzzle — rotate pieces, clear lines, and set high scores!"
      icon="🧩"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      isPaused={isPaused}
      onPauseToggle={() => setIsPaused(!isPaused)}
      howToPlayText="Use Arrow Keys or A/D to move left/right. Arrow Up/W to rotate piece. Arrow Down to soft drop. Spacebar to hard drop!"
      customControls={
        <div className="flex items-center gap-6 text-sm font-semibold text-cyan-200">
          <span>Lines: <strong className="text-cyan-400">{linesCleared}</strong></span>
        </div>
      }
      mobileControls={{
        onUp: rotatePiece,
        onDown: () => movePiece(0, 1),
        onLeft: () => movePiece(-1, 0),
        onRight: () => movePiece(1, 0),
        onAction: hardDrop,
        actionLabel: "DROP ⚡",
      }}
    >
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className="max-w-full rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-2xl"
        />

        {gameOver && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <p className="text-xl font-bold text-rose-400">💥 Board Topped Out!</p>
            <p className="text-sm text-slate-300">Final Score: {score}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {!isPlaying ? (
            <button
              onClick={startGame}
              className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
            >
              {gameOver ? "Play Again" : "Start Tetris"}
            </button>
          ) : (
            <button
              onClick={hardDrop}
              className="rounded-2xl bg-cyan-400 px-8 py-3 text-base font-bold text-slate-950 transition-all hover:bg-cyan-300"
            >
              Hard Drop (Space)
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
