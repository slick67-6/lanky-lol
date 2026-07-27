"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useToast } from "@/components/toast";
import { useState, useEffect, useRef, useCallback } from "react";

type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
type PieceColor = "w" | "b";

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (Piece | null)[][];

const PIECE_SYMBOLS: Record<string, string> = {
  w_k: "♔", w_q: "♕", w_r: "♖", w_b: "♗", w_n: "♘", w_p: "♙",
  b_k: "♚", b_q: "♛", b_r: "♜", b_b: "♝", b_n: "♞", b_p: "♟",
};

function createInitialBoard(): BoardState {
  const board: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: backRow[c], color: "w" };
  }
  return board;
}

function isValidMove(
  board: BoardState,
  from: [number, number],
  to: [number, number],
  playerColor: PieceColor
): boolean {
  const [fr, fc] = from;
  const [tr, tc] = to;

  const piece = board[fr][fc];
  if (!piece || piece.color !== playerColor) return false;

  const target = board[tr][tc];
  if (target && target.color === playerColor) return false;

  const dr = tr - fr;
  const dc = tc - fc;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  switch (piece.type) {
    case "p": {
      const dir = piece.color === "w" ? -1 : 1;
      const startRow = piece.color === "w" ? 6 : 1;

      if (dc === 0 && dr === dir && !target) return true;
      if (dc === 0 && dr === 2 * dir && fr === startRow && !target && !board[fr + dir][fc]) return true;
      if (absDc === 1 && dr === dir && target && target.color !== piece.color) return true;
      return false;
    }

    case "r": {
      if (dr !== 0 && dc !== 0) return false;
      const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
      const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
      let r = fr + stepR;
      let c = fc + stepC;
      while (r !== tr || c !== tc) {
        if (board[r][c]) return false;
        r += stepR;
        c += stepC;
      }
      return true;
    }

    case "n": {
      return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
    }

    case "b": {
      if (absDr !== absDc) return false;
      const stepR = dr > 0 ? 1 : -1;
      const stepC = dc > 0 ? 1 : -1;
      let r = fr + stepR;
      let c = fc + stepC;
      while (r !== tr || c !== tc) {
        if (board[r][c]) return false;
        r += stepR;
        c += stepC;
      }
      return true;
    }

    case "q": {
      if (dr !== 0 && dc !== 0 && absDr !== absDc) return false;
      const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
      const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
      let r = fr + stepR;
      let c = fc + stepC;
      while (r !== tr || c !== tc) {
        if (board[r][c]) return false;
        r += stepR;
        c += stepC;
      }
      return true;
    }

    case "k": {
      return absDr <= 1 && absDc <= 1;
    }
  }
  return false;
}

export default function OnlineChessGamePage() {
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>("w");
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState<PieceColor>("w");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(crypto.randomUUID());
  const { showToast } = useToast();

  const syncRoomState = async (newBoard: BoardState, nextTurn: PieceColor, gameWinner: string | null) => {
    try {
      await fetch("/api/game-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          roomCode,
          playerId: playerIdRef.current,
          state: { board: newBoard, turn: nextTurn, winner: gameWinner, lastMove: playerIdRef.current },
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
        showToast("Opponent connected! Game start.", "success");
      }

      const s = room?.state;
      if (s && s.board && s.turn && s.lastMove !== playerIdRef.current) {
        setBoard(s.board);
        setTurn(s.turn);
        if (s.winner) {
          setWinner(s.winner);
          setIsPlaying(false);
        }
      }
    } catch {}
  }, [roomCode, opponentConnected, showToast]);

  useEffect(() => {
    if (roomCode) {
      pollRef.current = setInterval(pollRoom, 1200);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [roomCode, pollRoom]);

  const createRoom = async () => {
    const res = await fetch("/api/game-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", game: "chess", playerId: playerIdRef.current }),
    });
    const { roomCode: code } = await res.json();
    setRoomCode(code);
    setPlayerSymbol("w");
    setBoard(createInitialBoard());
    setTurn("w");
    setWinner(null);
    setIsPlaying(true);
    setOpponentConnected(false);
    showToast(`Room ${code} created! Share this code with your opponent.`, "info");
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    const res = await fetch("/api/game-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", roomCode: code, playerId: playerIdRef.current }),
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, "error");
      return;
    }
    setRoomCode(code);
    setPlayerSymbol("b");
    setBoard(createInitialBoard());
    setTurn("w");
    setWinner(null);
    setIsPlaying(true);
    setOpponentConnected(true);
    showToast("Joined chess room successfully!", "success");
  };

  const handleSquareClick = (r: number, c: number) => {
    if (!isPlaying || turn !== playerSymbol) return;

    if (!selectedSquare) {
      const piece = board[r][c];
      if (piece && piece.color === playerSymbol) {
        setSelectedSquare([r, c]);
        soundManager.playBlip();
      }
      return;
    }

    const [fr, fc] = selectedSquare;
    if (fr === r && fc === c) {
      setSelectedSquare(null);
      return;
    }

    if (isValidMove(board, [fr, fc], [r, c], playerSymbol)) {
      const newBoard = board.map((row) => [...row]);
      const captured = newBoard[r][c];
      newBoard[r][c] = newBoard[fr][fc];
      newBoard[fr][fc] = null;

      if (captured) soundManager.playExplosion();
      else soundManager.playPop();

      const nextTurn = turn === "w" ? "b" : "w";
      let gameWinner: string | null = null;
      if (captured && captured.type === "k") {
        gameWinner = playerSymbol === "w" ? "White" : "Black";
        setWinner(gameWinner);
        setIsPlaying(false);
        soundManager.playWin();
      }

      setBoard(newBoard);
      setTurn(nextTurn);
      setSelectedSquare(null);
      syncRoomState(newBoard, nextTurn, gameWinner);
    } else {
      const targetPiece = board[r][c];
      if (targetPiece && targetPiece.color === playerSymbol) {
        setSelectedSquare([r, c]);
        soundManager.playBlip();
      } else {
        setSelectedSquare(null);
        soundManager.playHit();
      }
    }
  };

  return (
    <GameShell
      title="Online Chess"
      description="Live 1v1 Real-Time Multiplayer Chess — Create a room, share the code, and challenge your opponent!"
      icon="♟️"
      isPlaying={isPlaying}
      howToPlayText="Create or join an online room. White moves first. Click a piece to select it, then click a target square to make your move. Capturing the opponent King wins the match."
      customControls={
        <div className="flex flex-col items-center gap-3">
          {!roomCode ? (
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={createRoom}
                className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-900/60"
              >
                🎮 Create Multiplayer Room
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room Code..."
                  maxLength={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-mono text-cyan-100 uppercase"
                />
                <button
                  onClick={joinRoom}
                  disabled={!joinCode.trim()}
                  className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
                >
                  Join
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2">
              <span className="text-xs font-mono text-cyan-300">Room: <strong>{roomCode}</strong></span>
              <span className="text-xs font-bold text-slate-300">Playing as: {playerSymbol === "w" ? "White (♔)" : "Black (♚)"}</span>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 flex items-center justify-between w-full max-w-sm px-2 text-sm font-bold text-cyan-200">
          <span>Turn: {turn === "w" ? "White (♔)" : "Black (♚)"}</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full ${opponentConnected ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30" : "bg-amber-950 text-amber-300 border border-amber-500/30"}`}>
            {opponentConnected ? "🟢 Opponent Connected" : "⏳ Waiting for Opponent..."}
          </span>
        </div>

        {/* 8x8 Chess Board Grid */}
        <div className="grid grid-cols-8 gap-0 rounded-2xl border-4 border-slate-800 bg-slate-950 p-2 shadow-2xl overflow-hidden">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;

              let squareStyle = isDark
                ? "bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "bg-slate-800/60 text-cyan-100 hover:bg-slate-700/60";

              if (isSelected) {
                squareStyle = "bg-cyan-500/40 border-2 border-cyan-300 text-white scale-105 z-10 shadow-[0_0_15px_rgba(34,211,238,0.5)]";
              }

              const symbolKey = piece ? `${piece.color}_${piece.type}` : null;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  disabled={!isPlaying}
                  aria-label={`Square ${r + 1}, ${c + 1}`}
                  className={`aspect-square h-10 w-10 sm:h-12 sm:w-12 text-2xl sm:text-3xl font-bold flex items-center justify-center transition-all duration-150 ${squareStyle}`}
                >
                  {symbolKey ? PIECE_SYMBOLS[symbolKey] : ""}
                </button>
              );
            })
          )}
        </div>

        {winner && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
            <p className="text-xl font-bold text-emerald-300">🎉 {winner} Wins Checkmate!</p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
