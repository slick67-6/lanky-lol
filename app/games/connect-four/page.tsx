"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useState } from "react";

type CellPlayer = "red" | "yellow" | null;

const ROWS = 6;
const COLS = 7;

function checkConnect4Winner(board: CellPlayer[][]): CellPlayer {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r][c + 1] && p === board[r][c + 2] && p === board[r][c + 3]) return p;
    }
  }
  // Vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p === board[r + 1][c] && p === board[r + 2][c] && p === board[r + 3][c]) return p;
    }
  }
  // Diagonal Down-Right
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r + 1][c + 1] && p === board[r + 2][c + 2] && p === board[r + 3][c + 3]) return p;
    }
  }
  // Diagonal Up-Right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = board[r][c];
      if (p && p === board[r - 1][c + 1] && p === board[r - 2][c + 2] && p === board[r - 3][c + 3]) return p;
    }
  }
  return null;
}

export default function ConnectFourGamePage() {
  const [board, setBoard] = useState<CellPlayer[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<"red" | "yellow">("red");
  const [winner, setWinner] = useState<CellPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const dropDisc = (colIndex: number) => {
    if (!isPlaying || winner) return;

    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][colIndex]) {
        soundManager.playPop();
        const nextBoard = board.map((row) => [...row]);
        nextBoard[r][colIndex] = turn;
        setBoard(nextBoard);

        const win = checkConnect4Winner(nextBoard);
        if (win) {
          setWinner(win);
          setIsPlaying(false);
          soundManager.playWin();
        } else {
          setTurn(turn === "red" ? "yellow" : "red");
        }
        break;
      }
    }
  };

  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setTurn("red");
    setWinner(null);
    setIsPlaying(true);
  };

  return (
    <GameShell
      title="Connect Four"
      description="Drop discs to get 4 in a row horizontally, vertically, or diagonally!"
      icon="🔴"
      isPlaying={isPlaying}
      howToPlayText="Click any column to drop your colored disc into the lowest available slot. First player to connect 4 discs wins!"
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-sm font-semibold text-slate-300">
            Current Turn: <span className={turn === "red" ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
              {turn === "red" ? "🔴 Red Player" : "🟡 Yellow Player"}
            </span>
          </p>
        </div>

        {/* Board */}
        <div className="grid grid-cols-7 gap-2.5 p-4 rounded-3xl bg-cyan-950/80 border-4 border-cyan-500/40 shadow-2xl">
          {Array(COLS).fill(null).map((_, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-2.5">
              {Array(ROWS).fill(null).map((_, rowIdx) => {
                const cell = board[rowIdx][colIdx];
                return (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => dropDisc(colIdx)}
                    disabled={!isPlaying || !!winner}
                    aria-label={`Column ${colIdx + 1}`}
                    className={`aspect-square h-9 w-9 sm:h-11 sm:w-11 rounded-full border-2 transition-all ${
                      cell === "red"
                        ? "bg-rose-500 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                        : cell === "yellow"
                        ? "bg-amber-400 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                        : "bg-slate-950 border-cyan-500/20 hover:border-cyan-400"
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {winner && (
          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              🎉 {winner === "red" ? "🔴 Red Player Wins!" : "🟡 Yellow Player Wins!"}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={resetGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            Restart Match
          </button>
        </div>
      </div>
    </GameShell>
  );
}
