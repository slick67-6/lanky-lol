"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useEffect, useCallback, useRef } from "react";

const GRID_SIZE = 4;

const slideRow = (row: number[]): number[] => {
  const nonZero = row.filter((v) => v !== 0);
  const missing = GRID_SIZE - nonZero.length;
  return [...nonZero, ...Array(missing).fill(0)];
};

const combineRow = (row: number[], scoreAcc: { val: number }): number[] => {
  const result = [...row];
  for (let i = 0; i < GRID_SIZE - 1; i++) {
    if (result[i] !== 0 && result[i] === result[i + 1]) {
      result[i] *= 2;
      result[i + 1] = 0;
      scoreAcc.val += result[i];
      if (result[i] === 2048) soundManager.playWin();
    }
  }
  return result;
};

const moveLeft = (currentGrid: number[][], scoreAcc: { val: number }): number[][] => {
  return currentGrid.map((row) => {
    const slided = slideRow(row);
    const combined = combineRow(slided, scoreAcc);
    return slideRow(combined);
  });
};

const moveRight = (currentGrid: number[][], scoreAcc: { val: number }): number[][] => {
  return currentGrid.map((row) => {
    const reversed = [...row].reverse();
    const slided = slideRow(reversed);
    const combined = combineRow(slided, scoreAcc);
    const slidedBack = slideRow(combined);
    return slidedBack.reverse();
  });
};

const moveUp = (currentGrid: number[][], scoreAcc: { val: number }): number[][] => {
  const nextGrid = Array(GRID_SIZE)
    .fill(0)
    .map(() => Array(GRID_SIZE).fill(0));

  for (let c = 0; c < GRID_SIZE; c++) {
    const col = currentGrid.map((r) => r[c]);
    const slided = slideRow(col);
    const combined = combineRow(slided, scoreAcc);
    const slidedBack = slideRow(combined);
    for (let r = 0; r < GRID_SIZE; r++) {
      nextGrid[r][c] = slidedBack[r];
    }
  }
  return nextGrid;
};

const moveDown = (currentGrid: number[][], scoreAcc: { val: number }): number[][] => {
  const nextGrid = Array(GRID_SIZE)
    .fill(0)
    .map(() => Array(GRID_SIZE).fill(0));

  for (let c = 0; c < GRID_SIZE; c++) {
    const col = currentGrid.map((r) => r[c]).reverse();
    const slided = slideRow(col);
    const combined = combineRow(slided, scoreAcc);
    const slidedBack = slideRow(combined).reverse();
    for (let r = 0; r < GRID_SIZE; r++) {
      nextGrid[r][c] = slidedBack[r];
    }
  }
  return nextGrid;
};

const checkGameOver = (currentGrid: number[][]): boolean => {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentGrid[r][c] === 0) return false;
      if (r < GRID_SIZE - 1 && currentGrid[r][c] === currentGrid[r + 1][c]) return false;
      if (c < GRID_SIZE - 1 && currentGrid[r][c] === currentGrid[r][c + 1]) return false;
    }
  }
  return true;
};

export default function Game2048Page() {
  const addRandomTile = (currentGrid: number[][]) => {
    const emptyCells: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === 0) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const createInitialGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    return newGrid;
  };

  const [grid, setGrid] = useState<number[][]>(() => createInitialGrid());
  const [history, setHistory] = useState<{ grid: number[][]; score: number } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { highScore, updateHighScore } = useHighScore("2048", 0);

  const initializeGrid = useCallback(() => {
    const newGrid = Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setHistory(null);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
  }, []);

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (!isPlaying || gameOver) return;

      const scoreAcc = { val: 0 };
      let newGrid: number[][];

      switch (direction) {
        case "left":
          newGrid = moveLeft(grid, scoreAcc);
          break;
        case "right":
          newGrid = moveRight(grid, scoreAcc);
          break;
        case "up":
          newGrid = moveUp(grid, scoreAcc);
          break;
        case "down":
          newGrid = moveDown(grid, scoreAcc);
          break;
      }

      if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
        soundManager.playPop();
        setHistory({ grid: grid.map((r) => [...r]), score });

        addRandomTile(newGrid);
        setGrid(newGrid);

        const newScore = score + scoreAcc.val;
        setScore(newScore);
        updateHighScore(newScore);

        if (newGrid.flat().includes(2048) && !won) {
          setWon(true);
        }

        if (checkGameOver(newGrid)) {
          setGameOver(true);
          setIsPlaying(false);
          soundManager.playGameOver();
        }
      }
    },
    [grid, score, isPlaying, gameOver, won, updateHighScore]
  );

  const undoLastMove = () => {
    if (!history) return;
    soundManager.playBlip();
    setGrid(history.grid);
    setScore(history.score);
    setHistory(null);
    setGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          handleMove("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          handleMove("right");
          break;
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          handleMove("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          handleMove("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, gameOver, handleMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? "right" : "left");
      } else {
        handleMove(dy > 0 ? "down" : "up");
      }
    }
  };

  const getTileColor = (val: number) => {
    const colors: Record<number, string> = {
      0: "bg-slate-900/60 border-slate-700/60 text-transparent",
      2: "bg-cyan-950/60 border-cyan-500/30 text-cyan-200",
      4: "bg-cyan-900/60 border-cyan-500/40 text-cyan-100",
      8: "bg-cyan-800/70 border-cyan-400/50 text-white font-bold",
      16: "bg-cyan-700/80 border-cyan-400/60 text-white font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]",
      32: "bg-cyan-600/90 border-cyan-300 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.4)]",
      64: "bg-cyan-500 border-cyan-200 text-slate-950 font-black shadow-[0_0_25px_rgba(34,211,238,0.5)]",
      128: "bg-amber-500 border-amber-300 text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.5)]",
      256: "bg-amber-400 border-amber-200 text-slate-950 font-black shadow-[0_0_30px_rgba(251,191,36,0.6)]",
      512: "bg-rose-500 border-rose-300 text-white font-black shadow-[0_0_30px_rgba(244,63,94,0.6)]",
      1024: "bg-purple-500 border-purple-300 text-white font-black shadow-[0_0_30px_rgba(168,85,247,0.7)]",
      2048: "bg-emerald-400 border-emerald-200 text-slate-950 font-black shadow-[0_0_40px_rgba(52,211,153,0.9)] animate-pulse",
    };
    return colors[val] || "bg-emerald-400 border-emerald-200 text-slate-950 font-black";
  };

  return (
    <GameShell
      title="2048"
      description="Slide tiles, merge numbers, unlock 2048, and master the board!"
      icon="🔢"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      howToPlayText="Use Arrow Keys, WASD, or swipe on touchscreen to move all tiles. When two tiles with the same number touch, they merge into one!"
      customControls={
        <button
          onClick={undoLastMove}
          disabled={!history}
          className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-40"
        >
          ↩ Undo Last Move
        </button>
      }
      mobileControls={{
        onUp: () => handleMove("up"),
        onDown: () => handleMove("down"),
        onLeft: () => handleMove("left"),
        onRight: () => handleMove("right"),
      }}
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col items-center [touch-action:none]"
      >
        <div className="grid grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl">
          {grid.map((row, rIndex) =>
            row.map((cell, cIndex) => (
              <div
                key={`${rIndex}-${cIndex}`}
                className={`aspect-square h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 text-xl sm:text-2xl font-bold flex items-center justify-center transition-all duration-200 ${getTileColor(cell)}`}
              >
                {cell !== 0 ? cell : ""}
              </div>
            ))
          )}
        </div>

        {gameOver && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <p className="text-xl font-bold text-rose-400">💥 Board Full!</p>
            <p className="text-sm text-slate-300">Final Score: {score}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={initializeGrid}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Play Again" : "Restart Board"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
