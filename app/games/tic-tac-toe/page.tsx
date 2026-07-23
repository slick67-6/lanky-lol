"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect, useRef, useCallback } from "react";

type PlayMode = "local" | "online";

export default function TicTacToeGamePage() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<PlayMode>("local");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(crypto.randomUUID());

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every((square) => square !== null)) return "Draw";
    return null;
  };

  const handleClick = (index: number) => {
    if (!isPlaying || board[index] || winner) return;
    if (mode === "online" && currentPlayer !== playerSymbol) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      setIsPlaying(false);
      if (mode === "online") syncRoomState(newBoard, currentPlayer === "X" ? "O" : "X", gameWinner);
    } else {
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      setCurrentPlayer(nextPlayer);
      if (mode === "online") syncRoomState(newBoard, nextPlayer, null);
    }
  };

  const syncRoomState = async (newBoard: (string | null)[], nextPlayer: "X" | "O", gameWinner: string | null) => {
    try {
      await fetch("/api/game-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          roomCode,
          playerId: playerIdRef.current,
          state: { board: newBoard, currentPlayer: nextPlayer, winner: gameWinner, lastMove: playerIdRef.current },
        }),
      });
    } catch {}
  };

  const pollRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch("/api/game-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", roomCode }),
      });
      if (!res.ok) return;
      const { room } = await res.json();
      if (room?.players?.length >= 2 && !opponentConnected) {
        setOpponentConnected(true);
        setRoomStatus("Opponent joined!");
        setTimeout(() => setRoomStatus(null), 3000);
      }
      const s = room?.state;
      if (s && s.board && s.currentPlayer && s.lastMove !== playerIdRef.current) {
        setBoard(s.board);
        setCurrentPlayer(s.currentPlayer);
        if (s.winner) {
          setWinner(s.winner);
          setIsPlaying(false);
        }
      }
    } catch {}
  }, [roomCode, opponentConnected]);

  useEffect(() => {
    if (mode === "online" && roomCode) {
      pollRoom();
      pollRef.current = setInterval(pollRoom, 1500);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [mode, roomCode, pollRoom]);

  const createRoom = async () => {
    const res = await fetch("/api/game-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", game: "tictactoe", playerId: playerIdRef.current }),
    });
    const { roomCode: code } = await res.json();
    setRoomCode(code);
    setJoinCode("");
    setMode("online");
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setPlayerSymbol("X");
    setWinner(null);
    setIsPlaying(true);
    setOpponentConnected(false);
    setRoomStatus(`Room ${code} created — share this code with a friend!`);
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    const res = await fetch("/api/game-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", roomCode: joinCode.trim().toUpperCase(), playerId: playerIdRef.current }),
    });
    const data = await res.json();
    if (data.error) {
      setRoomStatus(data.error);
      return;
    }
    setRoomCode(joinCode.trim().toUpperCase());
    setMode("online");
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setPlayerSymbol("O");
    setWinner(null);
    setIsPlaying(true);
    setOpponentConnected(true);
    setRoomStatus("Joined! You are O — wait for X to move.");
    setTimeout(() => setRoomStatus(null), 3000);
  };

  const resetToLocal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setMode("local");
    setRoomCode("");
    setJoinCode("");
    setOpponentConnected(false);
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setWinner(null);
    setIsPlaying(true);
    setRoomStatus(null);
    setPlayerSymbol("X");
  };

  const resetGame = () => {
    if (mode === "online") {
      resetToLocal();
    } else {
      setBoard(Array(9).fill(null));
      setCurrentPlayer("X");
      setWinner(null);
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Tic Tac Toe" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              ⭕ Tic Tac Toe
            </h1>
            <p className="mb-8 text-slate-400">
              Classic X and O game — play local or invite a friend with a room code!
            </p>

            {mode === "local" ? (
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={createRoom}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-6 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-950/60 transition-colors"
                >
                  Create Online Room
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code..."
                    maxLength={6}
                    className="w-40 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm font-mono text-cyan-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!joinCode.trim()}
                    className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40 transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <div className="flex items-center justify-center gap-4">
                  <p className="text-sm text-cyan-300 font-mono">
                    Room: <span className="font-bold">{roomCode}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    {opponentConnected ? `You are ${playerSymbol}` : "Waiting for opponent..."}
                  </p>
                  <button
                    onClick={resetToLocal}
                    className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/50 transition-colors"
                  >
                    Leave
                  </button>
                </div>
              </div>
            )}

            {roomStatus && (
              <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-4 py-2">
                <p className="text-sm text-cyan-300">{roomStatus}</p>
              </div>
            )}

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
                  disabled={
                    !isPlaying ||
                    !!cell ||
                    (mode === "online" && currentPlayer !== playerSymbol)
                  }
                  className={`aspect-square rounded-xl border-2 text-4xl font-bold transition-all ${
                    cell
                      ? "border-cyan-500/50 bg-cyan-950/50"
                      : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/30"
                  } ${
                    !isPlaying || (mode === "online" && currentPlayer !== playerSymbol)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {winner && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">
                  {winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`}
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={resetGame}
                className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
              >
                {winner ? "Play Again" : mode === "online" ? "Leave & New Game" : "Restart"}
              </button>
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Click on a cell to place your mark. Get three in a row to win! In online mode, share the 6-letter room code with a friend.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}