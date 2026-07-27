"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { soundManager } from "@/lib/audio";
import { useToast } from "@/components/toast";
import { useState, useEffect, useRef, useCallback } from "react";

type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
type PieceColor = "w" | "b";

interface Piece {
  type: PieceType;
  color: PieceColor;
  id: string;
}

type BoardState = (Piece | null)[][];

const PIECE_SVG: Record<string, string> = {
  w_k: "♔", w_q: "♕", w_r: "♖", w_b: "♗", w_n: "♘", w_p: "♙",
  b_k: "♚", b_q: "♛", b_r: "♜", b_b: "♝", b_n: "♞", b_p: "♟",
};

function createInitialBoard(): BoardState {
  const board: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: "b", id: `b_${backRow[c]}_${c}` };
    board[1][c] = { type: "p", color: "b", id: `b_p_${c}` };
    board[6][c] = { type: "p", color: "w", id: `w_p_${c}` };
    board[7][c] = { type: backRow[c], color: "w", id: `w_${backRow[c]}_${c}` };
  }
  return board;
}

function getLegalMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];

  for (let tr = 0; tr < 8; tr++) {
    for (let tc = 0; tc < 8; tc++) {
      if (isValidMove(board, [r, c], [tr, tc], piece.color)) {
        moves.push([tr, tc]);
      }
    }
  }
  return moves;
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

export default function ChessPage() {
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>("w");
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);

  const [matchStatus, setMatchStatus] = useState<"idle" | "searching" | "playing" | "finished">("idle");
  const [roomCode, setRoomCode] = useState<string>("");
  const [playerSymbol, setPlayerSymbol] = useState<PieceColor>("w");
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(crypto.randomUUID());
  const { showToast } = useToast();

  const syncState = async (newBoard: BoardState, nextTurn: PieceColor, gameWinner: string | null) => {
    if (!roomCode) return;
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

      if (room?.state?.status === "playing" && matchStatus === "searching") {
        setMatchStatus("playing");
        showToast("Opponent found! Game start.", "success");
      }

      const s = room?.state;
      if (s && s.board && s.turn && s.lastMove !== playerIdRef.current) {
        setBoard(s.board);
        setTurn(s.turn);
        if (s.winner) {
          setWinner(s.winner);
          setMatchStatus("finished");
        }
      }
    } catch {}
  }, [roomCode, matchStatus, showToast]);

  useEffect(() => {
    if (roomCode) {
      pollRef.current = setInterval(pollRoom, 1000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [roomCode, pollRoom]);

  const findMatch = async () => {
    setMatchStatus("searching");
    setBoard(createInitialBoard());
    setTurn("w");
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);

    soundManager.playBlip();

    try {
      const res = await fetch("/api/game-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "matchmake", game: "chess", playerId: playerIdRef.current }),
      });
      const data = await res.json();

      setRoomCode(data.roomCode);
      setPlayerSymbol(data.color);

      if (data.room?.state?.status === "playing") {
        setMatchStatus("playing");
        showToast("Opponent matched! Game start.", "success");
      } else {
        showToast("Searching for an available online opponent...", "info");
      }
    } catch {
      showToast("Matchmaking service error.", "error");
      setMatchStatus("idle");
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (matchStatus !== "playing" || turn !== playerSymbol) return;

    if (!selectedSquare) {
      const piece = board[r][c];
      if (piece && piece.color === playerSymbol) {
        setSelectedSquare([r, c]);
        setLegalMoves(getLegalMoves(board, r, c));
        soundManager.playBlip();
      }
      return;
    }

    const [fr, fc] = selectedSquare;
    if (fr === r && fc === c) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (isValidMove(board, [fr, fc], [r, c], playerSymbol)) {
      const newBoard = board.map((row) => [...row]);
      const captured = newBoard[r][c];
      newBoard[r][c] = newBoard[fr][fc];
      newBoard[fr][fc] = null;

      if (captured) {
        soundManager.playExplosion();
        if (captured.color === "w") setCapturedWhite((prev) => [...prev, captured.type]);
        else setCapturedBlack((prev) => [...prev, captured.type]);
      } else {
        soundManager.playPop();
      }

      const nextTurn = turn === "w" ? "b" : "w";
      setLastMove({ from: [fr, fc], to: [r, c] });

      let gameWinner: string | null = null;
      if (captured && captured.type === "k") {
        gameWinner = playerSymbol === "w" ? "White" : "Black";
        setWinner(gameWinner);
        setMatchStatus("finished");
        soundManager.playWin();
      }

      setBoard(newBoard);
      setTurn(nextTurn);
      setSelectedSquare(null);
      setLegalMoves([]);
      syncState(newBoard, nextTurn, gameWinner);
    } else {
      const targetPiece = board[r][c];
      if (targetPiece && targetPiece.color === playerSymbol) {
        setSelectedSquare([r, c]);
        setLegalMoves(getLegalMoves(board, r, c));
        soundManager.playBlip();
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
        soundManager.playHit();
      }
    }
  };

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Online Chess" />

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center">
            {/* Play Match Button & Status */}
            <div className="mb-6 flex flex-col items-center gap-3 w-full">
              {matchStatus === "idle" && (
                <button
                  onClick={findMatch}
                  className="rounded-2xl bg-cyan-500 px-8 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
                >
                  ⚡ Find Online Opponent
                </button>
              )}

              {matchStatus === "searching" && (
                <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-6 py-3 text-sm text-cyan-200">
                  <span className="h-3 w-3 animate-ping rounded-full bg-cyan-400" />
                  <span>Searching for opponent...</span>
                </div>
              )}

              {matchStatus === "playing" && (
                <div className="flex items-center justify-between w-full max-w-md px-4 py-2 rounded-2xl border border-cyan-500/20 bg-slate-950/60 backdrop-blur-md">
                  <span className="text-sm font-semibold text-cyan-200">
                    Playing as: <strong>{playerSymbol === "w" ? "White (♔)" : "Black (♚)"}</strong>
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${turn === playerSymbol ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30 animate-pulse" : "bg-slate-900 text-slate-400"}`}>
                    {turn === playerSymbol ? "Your Turn" : "Opponent Turn"}
                  </span>
                </div>
              )}
            </div>

            {/* Chess Board Container */}
            <div className="relative rounded-3xl border-4 border-slate-800/80 bg-slate-950 p-3 shadow-2xl backdrop-blur-xl">
              {/* Top File Labels */}
              <div className="grid grid-cols-8 text-center text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 pb-1">
                {files.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>

              <div className="grid grid-cols-8 gap-0 border border-slate-800 overflow-hidden rounded-xl">
                {board.map((row, r) =>
                  row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                    const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c);
                    const isLastMove = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));

                    let bgStyle = isDark ? "bg-[#1e293b]" : "bg-[#334155]";
                    if (isLastMove) bgStyle = "bg-cyan-950/80";
                    if (isSelected) bgStyle = "bg-cyan-500/40 border-2 border-cyan-300";

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        disabled={matchStatus !== "playing"}
                        aria-label={`Square ${files[c]}${8 - r}`}
                        className={`relative aspect-square h-11 w-11 sm:h-14 sm:w-14 text-2xl sm:text-4xl font-bold flex items-center justify-center transition-all duration-200 ${bgStyle}`}
                      >
                        {isLegal && (
                          <span className="absolute h-3 w-3 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        )}
                        {piece && (
                          <span className="transition-transform duration-200 hover:scale-110">
                            {PIECE_SVG[`${piece.color}_${piece.type}`]}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Captured Pieces Display */}
            {(capturedWhite.length > 0 || capturedBlack.length > 0) && (
              <div className="mt-4 flex items-center justify-between w-full max-w-md text-xs font-mono text-slate-400">
                <span>Captured White: {capturedWhite.map((p) => PIECE_SVG[`w_${p}`]).join(" ")}</span>
                <span>Captured Black: {capturedBlack.map((p) => PIECE_SVG[`b_${p}`]).join(" ")}</span>
              </div>
            )}

            {winner && (
              <div className="mt-6 w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-center">
                <p className="text-xl font-bold text-emerald-300">🎉 {winner} Wins Checkmate!</p>
                <button
                  onClick={findMatch}
                  className="mt-3 rounded-xl bg-cyan-500 px-6 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Play Another Match
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
