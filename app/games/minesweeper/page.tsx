"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useEffect, useCallback, useRef } from "react";

type Difficulty = "easy" | "medium" | "hard";

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 20 },
  hard: { rows: 16, cols: 16, mines: 40 },
};

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  neighborMines: number;
}

function createEmptyGrid(rCount: number, cCount: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let i = 0; i < rCount; i++) {
    grid[i] = [];
    for (let j = 0; j < cCount; j++) {
      grid[i][j] = { isMine: false, revealed: false, flagged: false, neighborMines: 0 };
    }
  }
  return grid;
}

function populateMines(
  grid: Cell[][],
  rows: number,
  cols: number,
  mineCount: number,
  safeRow: number,
  safeCol: number
): Cell[][] {
  const populated = grid.map((r) => r.map((c) => ({ ...c })));
  let placed = 0;

  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const isNearSafe = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1;

    if (!populated[r][c].isMine && !isNearSafe) {
      populated[r][c].isMine = true;
      placed++;
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!populated[i][j].isMine) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && populated[ni][nj].isMine) {
              count++;
            }
          }
        }
        populated[i][j].neighborMines = count;
      }
    }
  }

  return populated;
}

export default function MinesweeperGamePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [grid, setGrid] = useState<Cell[][]>(() => createEmptyGrid(9, 9));
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [isFirstClick, setIsFirstClick] = useState<boolean>(true);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const { rows, cols, mines: mineCount } = CONFIGS[difficulty];
  const { highScore: bestTime, updateHighScore: updateBestTime } = useHighScore(`minesweeper_${difficulty}`, 999);

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    const cfg = CONFIGS[diff];
    setGrid(createEmptyGrid(cfg.rows, cfg.cols));
    setIsFirstClick(true);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
    setTimerSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const restartGrid = useCallback(() => {
    const cfg = CONFIGS[difficulty];
    setGrid(createEmptyGrid(cfg.rows, cfg.cols));
    setIsFirstClick(true);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
    setTimerSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [difficulty]);

  useEffect(() => {
    if (isPlaying && !isFirstClick && !gameOver) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isFirstClick, gameOver]);

  const toggleFlag = (row: number, col: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isPlaying || gameOver || grid[row][col].revealed) return;

    soundManager.playBlip();
    const nextGrid = grid.map((r) => r.map((c) => ({ ...c })));
    nextGrid[row][col].flagged = !nextGrid[row][col].flagged;
    setGrid(nextGrid);
  };

  const revealCell = (row: number, col: number) => {
    if (!isPlaying || gameOver || grid[row][col].revealed) return;

    if (flagMode) {
      toggleFlag(row, col);
      return;
    }

    if (grid[row][col].flagged) return;

    let currentGrid = grid;
    if (isFirstClick) {
      currentGrid = populateMines(grid, rows, cols, mineCount, row, col);
      setIsFirstClick(false);
    }

    const nextGrid = currentGrid.map((r) => r.map((c) => ({ ...c })));

    const floodFill = (r: number, c: number) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      if (nextGrid[r][c].revealed || nextGrid[r][c].flagged) return;

      nextGrid[r][c].revealed = true;

      if (nextGrid[r][c].isMine) {
        setGameOver(true);
        setWon(false);
        setIsPlaying(false);
        soundManager.playExplosion();

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (nextGrid[i][j].isMine) nextGrid[i][j].revealed = true;
          }
        }
        return;
      }

      if (nextGrid[r][c].neighborMines === 0) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            floodFill(r + di, c + dj);
          }
        }
      }
    };

    soundManager.playPop();
    floodFill(row, col);
    setGrid(nextGrid);

    const revealedCount = nextGrid.flat().filter((cell) => cell.revealed).length;
    if (revealedCount === rows * cols - mineCount) {
      setWon(true);
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playWin();
      updateBestTime(timerSeconds);
    }
  };

  const getCellColor = (cell: Cell) => {
    if (!cell.revealed) return "bg-slate-900/80 border-slate-700/80 hover:border-cyan-400/50";
    if (cell.isMine) return "bg-rose-950/80 border-rose-500/50";
    const colors = [
      "", "text-cyan-400", "text-emerald-400", "text-amber-400",
      "text-orange-400", "text-rose-400", "text-purple-400", "text-pink-400"
    ];
    return `bg-slate-800/80 border-slate-600/60 ${colors[cell.neighborMines] || ""}`;
  };

  const remainingMines = mineCount - grid.flat().filter((c) => c.flagged).length;

  return (
    <GameShell
      title="Minesweeper"
      description="Sweep the field using logic! Guaranteed safe first click & mobile flag mode."
      icon="💣"
      score={timerSeconds}
      highScore={bestTime === 999 ? 0 : bestTime}
      scoreLabel="Time (s)"
      highScoreLabel="Best (s)"
      isPlaying={isPlaying}
      howToPlayText="Click a cell to reveal it. Numbers indicate adjacent mines. Toggle Flag Mode or right-click to place flags on suspected mine locations."
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                  difficulty === d ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFlagMode(!flagMode)}
            className={`rounded-xl border px-4 py-1.5 text-xs font-semibold transition-all ${
              flagMode
                ? "border-rose-500 bg-rose-950/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40"
            }`}
          >
            🚩 Flag Mode: {flagMode ? "ON" : "OFF"}
          </button>

          <span className="text-xs font-bold text-cyan-300">
            💣 {remainingMines} left
          </span>
        </div>
      }
    >
      <div className="flex flex-col items-center overflow-x-auto p-2">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {grid.map((row, rIndex) =>
            row.map((cell, cIndex) => (
              <button
                key={`${rIndex}-${cIndex}`}
                onClick={() => revealCell(rIndex, cIndex)}
                onContextMenu={(e) => toggleFlag(rIndex, cIndex, e)}
                disabled={!isPlaying}
                aria-label={`Cell ${rIndex + 1}, ${cIndex + 1}`}
                className={`aspect-square h-8 w-8 sm:h-9 sm:w-9 rounded-lg border text-sm font-bold transition-all flex items-center justify-center ${getCellColor(cell)}`}
              >
                {cell.flagged
                  ? "🚩"
                  : !cell.revealed
                  ? ""
                  : cell.isMine
                  ? "💣"
                  : cell.neighborMines > 0
                  ? cell.neighborMines
                  : ""}
              </button>
            ))
          )}
        </div>

        {gameOver && (
          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              {won ? "🎉 Field Cleared!" : "💥 Detonated!"}
            </p>
            <p className="text-sm text-slate-300">Time: {timerSeconds} seconds</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={restartGrid}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Play Again" : "New Field"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
