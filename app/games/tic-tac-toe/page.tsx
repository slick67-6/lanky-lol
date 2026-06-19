"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";

export default function TicTacToeGamePage() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every((square) => square !== null)) {
      return "Draw";
    }

    return null;
  };

  const handleClick = (index: number) => {
    if (!isPlaying || board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      setIsPlaying(false);
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setWinner(null);
    setIsPlaying(true);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Tic Tac Toe" />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              ⭕ Tic Tac Toe
            </h1>
            <p className="mb-8 text-slate-400">
              Classic X and O game. Get three in a row to win!
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Current Turn</p>
                <p className="text-2xl font-bold text-cyan-100">{currentPlayer}</p>
              </div>
              {winner && (
                <div className="text-center">
                  <p className="text-sm text-slate-400">Result</p>
                  <p className="text-2xl font-bold text-cyan-100">
                    {winner === "Draw" ? "Draw!" : `${winner} Wins!`}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleClick(index)}
                  disabled={!isPlaying || !!cell}
                  className={`aspect-square rounded-xl border-2 text-4xl font-bold transition-all ${
                    cell
                      ? "border-cyan-500/50 bg-cyan-950/50"
                      : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/30"
                  } ${!isPlaying ? "opacity-50" : ""}`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {winner && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">
                  {winner === "Draw" ? "🤝 It's a Draw!" : `🎉 ${winner} Wins!`}
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={resetGame}
                className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
              >
                {winner ? "Play Again" : "Restart"}
              </button>
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Click on a cell to place your mark. Get three in a row (horizontal, vertical, or diagonal) to win!</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
