"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect } from "react";

export default function Game2048Page() {
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const GRID_SIZE = 4;

  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = () => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const addRandomTile = (currentGrid: number[][]) => {
    const emptyCells: { row: number; col: number }[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const slideRow = (row: number[]) => {
    let arr = row.filter((val) => val !== 0);
    let missing = GRID_SIZE - arr.length;
    let zeros = Array(missing).fill(0);
    return [...arr, ...zeros];
  };

  const combineRow = (row: number[]) => {
    for (let i = 0; i < GRID_SIZE - 1; i++) {
      if (row[i] !== 0 && row[i] === row[i + 1]) {
        row[i] *= 2;
        row[i + 1] = 0;
        setScore((prev) => prev + row[i]);
      }
    }
    return row;
  };

  const moveLeft = (currentGrid: number[][]) => {
    let newGrid = currentGrid.map((row) => {
      let newRow = slideRow(row);
      newRow = combineRow(newRow);
      return slideRow(newRow);
    });
    return newGrid;
  };

  const moveRight = (currentGrid: number[][]) => {
    let newGrid = currentGrid.map((row) => {
      let newRow = slideRow(row.reverse());
      newRow = combineRow(newRow);
      return slideRow(newRow).reverse();
    });
    return newGrid;
  };

  const moveUp = (currentGrid: number[][]) => {
    let newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    for (let i = 0; i < GRID_SIZE; i++) {
      let col = currentGrid.map((row) => row[i]);
      let newCol = slideRow(col);
      newCol = combineRow(newCol);
      newCol = slideRow(newCol);
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[j][i] = newCol[j];
      }
    }
    return newGrid;
  };

  const moveDown = (currentGrid: number[][]) => {
    let newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    for (let i = 0; i < GRID_SIZE; i++) {
      let col = currentGrid.map((row) => row[i]).reverse();
      let newCol = slideRow(col);
      newCol = combineRow(newCol);
      newCol = slideRow(newCol).reverse();
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[j][i] = newCol[j];
      }
    }
    return newGrid;
  };

  const checkGameOver = (currentGrid: number[][]) => {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) return false;
        if (i < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i + 1][j]) return false;
        if (j < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i][j + 1]) return false;
      }
    }
    return true;
  };

  const handleMove = (direction: "left" | "right" | "up" | "down") => {
    if (!isPlaying || gameOver) return;

    let newGrid: number[][];
    switch (direction) {
      case "left":
        newGrid = moveLeft(grid);
        break;
      case "right":
        newGrid = moveRight(grid);
        break;
      case "up":
        newGrid = moveUp(grid);
        break;
      case "down":
        newGrid = moveDown(grid);
        break;
      default:
        return;
    }

    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      addRandomTile(newGrid);
      setGrid(newGrid);

      if (checkGameOver(newGrid)) {
        setGameOver(true);
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          handleMove("left");
          break;
        case "ArrowRight":
          handleMove("right");
          break;
        case "ArrowUp":
          handleMove("up");
          break;
        case "ArrowDown":
          handleMove("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [grid, isPlaying, gameOver]);

  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      0: "bg-slate-800/50",
      2: "bg-cyan-900/50",
      4: "bg-cyan-800/50",
      8: "bg-cyan-700/50",
      16: "bg-cyan-600/50",
      32: "bg-cyan-500/50",
      64: "bg-cyan-400/50",
      128: "bg-cyan-300/50",
      256: "bg-cyan-200/50",
      512: "bg-cyan-100/50",
      1024: "bg-cyan-50/50",
      2048: "bg-cyan-400",
    };
    return colors[value] || "bg-cyan-400";
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="2048" />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🔢 2048
            </h1>
            <p className="mb-8 text-slate-400">
              Slide tiles to combine numbers and reach 2048!
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-2xl font-bold text-cyan-100">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-2xl font-bold text-cyan-100">
                  {gameOver ? "Game Over" : isPlaying ? "Playing" : "Ready"}
                </p>
              </div>
            </div>

            <div className="mb-6 inline-grid grid-cols-4 gap-2">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`aspect-square rounded-lg border-2 border-slate-700 flex items-center justify-center text-2xl font-bold ${getTileColor(cell)} ${cell !== 0 ? "text-cyan-100" : "text-slate-600"}`}
                  >
                    {cell !== 0 ? cell : ""}
                  </div>
                ))
              )}
            </div>

            {gameOver && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 p-4">
                <p className="text-lg font-semibold text-red-400">Game Over!</p>
                <p className="text-slate-400">Final Score: {score}</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={initializeGrid}
                className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
              >
                {gameOver ? "Play Again" : "Restart"}
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
