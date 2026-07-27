"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useToast } from "@/components/toast";
import { useState, useEffect, useRef, useCallback } from "react";

type PlayMode = "local" | "vs-ai" | "online";

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(squares: (string | null)[]) {
  for (const [a, b, c] of WINNING_COMBOS) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], combo: [a, b, c] };
    }
  }
  if (squares.every((square) => square !== null)) return { winner: "Draw", combo: null };
  return null;
}

export default function TicTacToeGamePage() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<PlayMode>("vs-ai");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X");
  const [opponentConnected, setOpponentConnected] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(crypto.randomUUID());
  const { showToast } = useToast();

  const getBestAIMove = useCallback((currentBoard: (string | null)[]): number => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((v): v is number => v !== null);

    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = "O";
      if (checkWinner(copy)?.winner === "O") return idx;
    }

    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = "X";
      if (checkWinner(copy)?.winner === "X") return idx;
    }

    if (emptyIndices.includes(4)) return 4;
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }, []);

  const handleClick = (index: number) => {
    if (!isPlaying || board[index] || winner) return;
    if (mode === "online" && currentPlayer !== playerSymbol) return;

    soundManager.playPop();

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      setWinner(winResult.winner);
      setWinningCombo(winResult.combo);
      setIsPlaying(false);
      if (winResult.winner === "Draw") soundManager.playBlip();
      else soundManager.playWin();

      if (mode === "online") syncRoomState(newBoard, currentPlayer === "X" ? "O" : "X", winResult.winner);
    } else {
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      setCurrentPlayer(nextPlayer);

      if (mode === "online") {
        syncRoomState(newBoard, nextPlayer, null);
      } else if (mode === "vs-ai" && nextPlayer === "O") {
        setTimeout(() => {
          const aiMove = getBestAIMove(newBoard);
          if (aiMove !== undefined) {
            soundManager.playPop();
            const aiBoard = [...newBoard];
            aiBoard[aiMove] = "O";
            setBoard(aiBoard);

            const aiWinResult = checkWinner(aiBoard);
            if (aiWinResult) {
              setWinner(aiWinResult.winner);
              setWinningCombo(aiWinResult.combo);
              setIsPlaying(false);
              if (aiWinResult.winner === "O") soundManager.playGameOver();
            } else {
              setCurrentPlayer("X");
            }
          }
        }, 400);
      }
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
        showToast("Opponent joined the room!", "success");
      }
      const s = room?.state;
      if (s && s.board && s.currentPlayer && s.lastMove !== playerIdRef.current) {
        setBoard(s.board);
        setCurrentPlayer(s.currentPlayer);
        if (s.winner) {
          const winResult = checkWinner(s.board);
          setWinner(s.winner);
          setWinningCombo(winResult?.combo || null);
          setIsPlaying(false);
        }
      }
    } catch {}
  }, [roomCode, opponentConnected, showToast]);

  useEffect(() => {
    if (mode === "online" && roomCode) {
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
    setWinningCombo(null);
    setIsPlaying(true);
    setOpponentConnected(false);
    showToast(`Room ${code} created! Share this code with a friend.`, "info");
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
      showToast(data.error, "error");
      return;
    }
    setRoomCode(joinCode.trim().toUpperCase());
    setMode("online");
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setPlayerSymbol("O");
    setWinner(null);
    setWinningCombo(null);
    setIsPlaying(true);
    setOpponentConnected(true);
    showToast("Joined room successfully!", "success");
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      showToast("Room code copied to clipboard!", "success");
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setWinner(null);
    setWinningCombo(null);
    setIsPlaying(true);
  };

  return (
    <GameShell
      title="Tic Tac Toe"
      description="Classic X and O — play vs AI, 2-Player local, or online with a room code!"
      icon="⭕"
      isPlaying={isPlaying}
      howToPlayText="Click any cell to place your mark. Match 3 in a row horizontally, vertically, or diagonally to win."
      customControls={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
            <button
              onClick={() => { setMode("vs-ai"); resetGame(); }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "vs-ai" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              Vs AI
            </button>
            <button
              onClick={() => { setMode("local"); resetGame(); }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "local" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              2P Local
            </button>
            <button
              onClick={() => { setMode("online"); resetGame(); }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "online" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              🌐 Online
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        {mode === "online" && (
          <div className="mb-6 flex flex-col items-center gap-3 w-full max-w-sm">
            {!roomCode ? (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={createRoom}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                >
                  Create New Online Room
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Room Code..."
                    maxLength={6}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-mono text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!joinCode.trim()}
                    className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 w-full rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3">
                <span className="text-sm font-mono text-cyan-200">Room: <strong>{roomCode}</strong></span>
                <button
                  onClick={copyRoomCode}
                  className="rounded-lg bg-cyan-900/60 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-800/60"
                >
                  Copy Code
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mb-4 text-center">
          <p className="text-sm text-slate-400">Current Turn: <span className="font-bold text-cyan-300">{currentPlayer}</span></p>
        </div>

        <div className="relative grid grid-cols-3 gap-3 max-w-[280px] p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl">
          {board.map((cell, index) => {
            const isWinningCell = winningCombo?.includes(index);
            return (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={!isPlaying || !!cell || (mode === "online" && currentPlayer !== playerSymbol)}
                aria-label={`Cell ${index + 1}`}
                className={`aspect-square h-20 w-20 rounded-2xl border-2 text-4xl font-bold flex items-center justify-center transition-all ${
                  isWinningCell
                    ? "border-emerald-400 bg-emerald-950/80 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-105"
                    : cell
                    ? "border-cyan-500/50 bg-cyan-950/60 text-cyan-100"
                    : "border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900"
                }`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {winner && (
          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              {winner === "Draw" ? "🤝 It's a Draw!" : `🎉 ${winner} Wins!`}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={resetGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            Restart Board
          </button>
        </div>
      </div>
    </GameShell>
  );
}