"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useEffect, useState } from "react";

export default function MinesweeperGamePage() {
  const GRID_SIZE = 10;
  const MINE_COUNT = 10;

  const [grid, setGrid] = useState<{ isMine: boolean; revealed: boolean; flagged: boolean; neighborMines: number }[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const initializeGrid = () => {
    const newGrid: { isMine: boolean; revealed: boolean; flagged: boolean; neighborMines: number }[][] = [];
    
    // Create empty grid
    for (let i = 0; i < GRID_SIZE; i++) {
      newGrid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[i][j] = { isMine: false, revealed: false, flagged: false, neighborMines: 0 };
      }
    }

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (!newGrid[row][col].isMine) {
        newGrid[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mines
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (!newGrid[i][j].isMine) {
          let count = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < GRID_SIZE && nj >= 0 && nj < GRID_SIZE && newGrid[ni][nj].isMine) {
                count++;
              }
            }
          }
          newGrid[i][j].neighborMines = count;
        }
      }
    }

    setGrid(newGrid);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
  };

  const revealCell = (row: number, col: number) => {
    if (!isPlaying || gameOver || grid[row][col].revealed || grid[row][col].flagged) return;

    const newGrid = [...grid.map(row => [...row])];

    const reveal = (r: number, c: number) => {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
      if (newGrid[r][c].revealed || newGrid[r][c].flagged) return;

      newGrid[r][c].revealed = true;

      if (newGrid[r][c].isMine) {
        setGameOver(true);
        setWon(false);
        setIsPlaying(false);
        // Reveal all mines
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            if (newGrid[i][j].isMine) {
              newGrid[i][j].revealed = true;
            }
          }
        }
        setGrid(newGrid);
        return;
      }

      if (newGrid[r][c].neighborMines === 0) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            reveal(r + di, c + dj);
          }
        }
      }
    };

    reveal(row, col);
    setGrid(newGrid);

    // Check win condition
    const revealedCount = newGrid.flat().filter(cell => cell.revealed).length;
    if (revealedCount === GRID_SIZE * GRID_SIZE - MINE_COUNT) {
      setWon(true);
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  const toggleFlag = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isPlaying || gameOver || grid[row][col].revealed) return;

    const newGrid = [...grid.map(row => [...row])];
    newGrid[row][col].flagged = !newGrid[row][col].flagged;
    setGrid(newGrid);
  };

  const getCellContent = (cell: { isMine: boolean; revealed: boolean; flagged: boolean; neighborMines: number }) => {
    if (cell.flagged) return "🚩";
    if (!cell.revealed) return "";
    if (cell.isMine) return "💣";
    if (cell.neighborMines === 0) return "";
    return cell.neighborMines.toString();
  };

  const getCellColor = (cell: { isMine: boolean; revealed: boolean; flagged: boolean; neighborMines: number }) => {
    if (!cell.revealed) return "bg-slate-900/50 border-slate-700";
    if (cell.isMine) return "bg-red-950/50 border-red-500/50";
    const colors = ["", "text-cyan-400", "text-green-400", "text-yellow-400", "text-orange-400", "text-red-400", "text-purple-400", "text-pink-400", "text-slate-400"];
    return `bg-slate-800/50 border-slate-600 ${colors[cell.neighborMines]}`;
  };

  useEffect(() => {
    initializeGrid();
  }, []);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Minesweeper" />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              💣 Minesweeper
            </h1>
            <p className="mb-8 text-slate-400">
              Find all mines without detonating them. Use logic and luck!
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Mines</p>
                <p className="text-2xl font-bold text-cyan-100">{MINE_COUNT}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-2xl font-bold text-cyan-100">
                  {won ? "Won!" : gameOver ? "Lost" : isPlaying ? "Playing" : "Ready"}
                </p>
              </div>
            </div>

            <div className="mb-6 inline-grid grid-cols-10 gap-1">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => revealCell(rowIndex, colIndex)}
                    onContextMenu={(e) => toggleFlag(rowIndex, colIndex, e)}
                    disabled={!isPlaying}
                    className={`aspect-square rounded border-2 text-sm font-bold transition-all ${getCellColor(cell)} ${!isPlaying ? "opacity-50" : ""}`}
                  >
                    {getCellContent(cell)}
                  </button>
                ))
              )}
            </div>

            {gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">
                  {won ? "🎉 You Won!" : "💥 Game Over!"}
                </p>
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
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Left-click to reveal cells. Right-click to flag mines. Numbers indicate adjacent mines.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
