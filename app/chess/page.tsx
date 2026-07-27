"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
type PieceColor = "w" | "b";
interface Piece { type: PieceType; color: PieceColor; }
type Square = Piece | null;
type Board = Square[][];
type MatchStatus = "idle" | "searching" | "playing" | "finished";
interface MoveAnim { fromR: number; fromC: number; toR: number; toC: number; active: boolean; }

// ─── Pieces ───────────────────────────────────────────────────────────────────
const GLYPHS: Record<string, string> = {
  w_k: "♚", w_q: "♛", w_r: "♜", w_b: "♝", w_n: "♞", w_p: "♟",
  b_k: "♚", b_q: "♛", b_r: "♜", b_b: "♝", b_n: "♞", b_p: "♟",
};

// ─── Board helpers ────────────────────────────────────────────────────────────
function freshBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: "b" };
    b[1][c] = { type: "p", color: "b" };
    b[6][c] = { type: "p", color: "w" };
    b[7][c] = { type: back[c], color: "w" };
  }
  return b;
}

function isLegal(b: Board, from: [number, number], to: [number, number], color: PieceColor): boolean {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = b[fr][fc];
  if (!piece || piece.color !== color) return false;
  const target = b[tr][tc];
  if (target && target.color === color) return false;
  const dr = tr - fr, dc = tc - fc;
  const adr = Math.abs(dr), adc = Math.abs(dc);
  if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
  function clear(sr: number, sc: number, er: number, ec: number): boolean {
    const rStep = er === sr ? 0 : er > sr ? 1 : -1;
    const cStep = ec === sc ? 0 : ec > sc ? 1 : -1;
    let r = sr + rStep, c = sc + cStep;
    while (r !== er || c !== ec) { if (b[r][c]) return false; r += rStep; c += cStep; }
    return true;
  }
  switch (piece.type) {
    case "p": {
      const dir = color === "w" ? -1 : 1;
      const start = color === "w" ? 6 : 1;
      if (dc === 0 && dr === dir && !target) return true;
      if (dc === 0 && dr === 2 * dir && fr === start && !target && !b[fr + dir][fc]) return true;
      if (adc === 1 && dr === dir && target && target.color !== color) return true;
      return false;
    }
    case "r": return (dr === 0 || dc === 0) && clear(fr, fc, tr, tc);
    case "n": return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    case "b": return adr === adc && clear(fr, fc, tr, tc);
    case "q": return (dr === 0 || dc === 0 || adr === adc) && clear(fr, fc, tr, tc);
    case "k": return adr <= 1 && adc <= 1;
  }
}

function legalTargets(b: Board, r: number, c: number): [number, number][] {
  const piece = b[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  for (let tr = 0; tr < 8; tr++)
    for (let tc = 0; tc < 8; tc++)
      if (isLegal(b, [r, c], [tr, tc], piece.color)) moves.push([tr, tc]);
  return moves;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChessPage() {
  const [board, setBoard] = useState<Board>(freshBoard);
  const [boardTheme, setBoardTheme] = useState<"classic"|"slate"|"walnut"|"ice"|"obsidian">("classic");
  const [turn, setTurn] = useState<PieceColor>("w");
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [hints, setHints] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [anim, setAnim] = useState<MoveAnim | null>(null);

  const [status, setStatus] = useState<MatchStatus>("idle");
  const [roomId, setRoomId] = useState("");
  const [myColor, setMyColor] = useState<PieceColor>("w");
  const [capturedW, setCapturedW] = useState<PieceType[]>([]);
  const [capturedB, setCapturedB] = useState<PieceType[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);

  const myId = useRef("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<string>("");
  const statusRef = useRef<MatchStatus>("idle");

  useEffect(() => {
    if (!myId.current) {
      myId.current = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString(36);
    }
  }, []);

  useEffect(() => { statusRef.current = status; }, [status]);

  function showToast(msg: string, type: "ok" | "err" | "info" = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Polling ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch("/api/chess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", roomId }),
      });
      const data = await res.json();

      if (statusRef.current === "searching" && data.playerCount >= 2) {
        setStatus("playing");
        showToast("Opponent connected — game on!", "ok");
      }

      const s = data.state;
      if (s && s.board && s.sig && s.sig !== lastSyncRef.current && s.lastPlayer !== myId.current) {
        lastSyncRef.current = s.sig;
        setBoard(s.board);
        setTurn(s.turn);
        setLastMove(s.lastMove || null);
        setMoveCount((n) => n + 1);
        if (s.capturedW) setCapturedW(s.capturedW);
        if (s.capturedB) setCapturedB(s.capturedB);
        if (s.winner) { setWinner(s.winner); setStatus("finished"); }
      }
    } catch {}
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      pollRef.current = setInterval(poll, 800);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [roomId, poll]);

  // ─── Push move ───────────────────────────────────────────────────────────────
  const pushMove = useCallback(async (
    newBoard: Board, nextTurn: PieceColor,
    newLast: { from: [number, number]; to: [number, number] },
    newCW: PieceType[], newCB: PieceType[],
    gameWinner: string | null, mc: number
  ) => {
    const sig = mc.toString(36) + nextTurn;
    lastSyncRef.current = sig;
    try {
      await fetch("/api/chess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move", roomId, playerId: myId.current,
          state: { board: newBoard, turn: nextTurn, lastMove: newLast, capturedW: newCW, capturedB: newCB, winner: gameWinner, lastPlayer: myId.current, sig },
        }),
      });
    } catch {}
  }, [roomId]);

  // ─── Matchmake ───────────────────────────────────────────────────────────────
  async function findMatch() {
    setStatus("searching");
    setBoard(freshBoard());
    setTurn("w");
    setSelected(null);
    setHints([]);
    setLastMove(null);
    setCapturedW([]);
    setCapturedB([]);
    setWinner(null);
    setMoveCount(0);
    lastSyncRef.current = "";
    try {
      const res = await fetch("/api/chess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "matchmake", playerId: myId.current }),
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setMyColor(data.color);
      if (data.status === "matched") {
        setStatus("playing");
        showToast(`Matched! You play ${data.color === "w" ? "White" : "Black"}.`, "ok");
      } else {
        showToast("Waiting for an opponent…", "info");
      }
    } catch {
      showToast("Connection error. Try again.", "err");
      setStatus("idle");
    }
  }

  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    try { await fetch("/api/chess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", roomId, playerId: myId.current }) }); } catch {}
    setStatus("idle");
    setRoomId("");
  }

  // ─── Square click handler ─────────────────────────────────────────────────────
  const handleSquare = useCallback((r: number, c: number) => {
    if (status !== "playing" || turn !== myColor) return;
    if (!selected) {
      const piece = board[r][c];
      if (piece?.color === myColor) { setSelected([r, c]); setHints(legalTargets(board, r, c)); }
      return;
    }
    const [fr, fc] = selected;
    if (fr === r && fc === c) { setSelected(null); setHints([]); return; }
    if (isLegal(board, [fr, fc], [r, c], myColor)) {
      setAnim({ fromR: fr, fromC: fc, toR: r, toC: c, active: true });
      setTimeout(() => setAnim(null), 300);
      const nb = board.map((row) => [...row]);
      const captured = nb[r][c];
      nb[r][c] = nb[fr][fc];
      nb[fr][fc] = null;
      if (nb[r][c]?.type === "p" && (r === 0 || r === 7)) nb[r][c] = { type: "q", color: myColor };
      const newCW = [...capturedW];
      const newCB = [...capturedB];
      if (captured) { if (captured.color === "w") newCW.push(captured.type); else newCB.push(captured.type); }
      const nextTurn: PieceColor = turn === "w" ? "b" : "w";
      const newLast = { from: [fr, fc] as [number, number], to: [r, c] as [number, number] };
      let gameWinner: string | null = null;
      if (captured?.type === "k") { gameWinner = myColor === "w" ? "White" : "Black"; setWinner(gameWinner); setStatus("finished"); }
      setBoard(nb); setTurn(nextTurn); setLastMove(newLast); setCapturedW(newCW); setCapturedB(newCB);
      setMoveCount((n) => n + 1); setSelected(null); setHints([]);
      pushMove(nb, nextTurn, newLast, newCW, newCB, gameWinner, moveCount + 1);
    } else {
      const piece = board[r][c];
      if (piece?.color === myColor) { setSelected([r, c]); setHints(legalTargets(board, r, c)); }
      else { setSelected(null); setHints([]); }
    }
  }, [board, selected, myColor, status, turn, capturedW, capturedB, moveCount, pushMove]);

  // ─── Board orientation ────────────────────────────────────────────────────────
  // freshBoard: b[0] = black back rank (rank 8), b[7] = white back rank (rank 1)
  // White perspective: rank 8 (b[0]) at visual top, rank 1 (b[7]) at visual bottom
  // Black perspective: rank 1 (b[7]) at visual top, rank 8 (b[0]) at visual bottom
  const ranks = useMemo(
    () => myColor === "b" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7],
    [myColor]
  );
  const files = useMemo(
    () => myColor === "b" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7],
    [myColor]
  );
  const fileLabels = useMemo(() => ["a", "b", "c", "d", "e", "f", "g", "h"], []);

  // ─── Board squares ────────────────────────────────────────────────────────────
  const squareElements = useMemo(() => {
    const canInteract = status === "playing" && turn === myColor;
    return ranks.flatMap((r, rowIdx) =>
      files.map((c, colIdx) => {
        const piece = board[r][c];
        // Square color based on VISUAL position (rowIdx, colIdx) — not board coords
        // Standard: a1 is dark for white. a1 = board[7][0]. When white: rowIdx=7→board row 0? No.
        // White perspective: visual (0,0) = board (7,0) = a8 = light
        // a1 = board[7][0] → white visual (7,0) → rowIdx=7,colIdx=0 → (7+0)%2=1 → dark ✓
        // Standard chess: a1 dark, a8 light. (rowIdx+colIdx)%2===0 → light
        const isLight = (rowIdx + colIdx) % 2 === 0;
        const isSel = selected?.[0] === r && selected?.[1] === c;
        const isHint = hints.some(([hr, hc]) => hr === r && hc === c);
        const isFrom = lastMove?.from[0] === r && lastMove?.from[1] === c;
        const isTo = lastMove?.to[0] === r && lastMove?.to[1] === c;
        const isAnimFrom = anim?.fromR === r && anim?.fromC === c;
        const isAnimTo = anim?.toR === r && anim?.toC === c;
        const isCapture = isHint && !!piece;

        let squareClass = "chess-square";
        if (isLight) squareClass += " chess-square--light";
        else squareClass += " chess-square--dark";
        if (isSel) squareClass += " chess-square--selected";
        if (isFrom || isTo) squareClass += isLight ? " chess-square--last-light" : " chess-square--last-dark";
        if (isAnimFrom) squareClass += " chess-square--anim-from";
        if (isAnimTo) squareClass += " chess-square--anim-to";

        // Rank number shown on leftmost column
        const rankNum = 8 - r; // board row 0 → rank 8, board row 7 → rank 1
        // File letter shown on bottom row
        const fileLetter = fileLabels[c];

        return (
          <button
            key={`${r}-${c}`}
            className={squareClass}
            onClick={() => handleSquare(r, c)}
            disabled={!canInteract}
            aria-label={`${fileLetter}${rankNum}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
          >
            {/* Corner rank label — only leftmost column */}
            {colIdx === 0 && (
              <span className="chess-corner-rank">{rankNum}</span>
            )}
            {/* Corner file label — only bottom row */}
            {rowIdx === 7 && (
              <span className="chess-corner-file">{fileLetter}</span>
            )}
            {isHint && !isCapture && <span className="chess-hint-dot" />}
            {isCapture && <span className="chess-hint-capture" />}
            {piece && (
              <span className={`chess-piece chess-piece--${piece.color}`}>
                {GLYPHS[`${piece.color}_${piece.type}`]}
              </span>
            )}
          </button>
        );
      })
    );
  }, [board, selected, hints, lastMove, anim, status, turn, myColor, ranks, files, fileLabels, handleSquare]);

  const isMyTurn = status === "playing" && turn === myColor;

  return (
    <div className="chess-page">
      {/* Toast */}
      {toast && <div className={`chess-toast chess-toast--${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <header className="chess-header">
        <Link href="/" className="chess-brand">
          <span className="chess-brand-l">L</span>
          <span>lanky.lol</span>
        </Link>
        <div className="chess-header-center">
          <span className="chess-title-pill">♟ Lanky Chess</span>
        </div>
        <Link href="/games" className="chess-nav-link">Arcade →</Link>
      </header>

      <main className="chess-main">
        {/* Status Bar */}
        <div className="chess-status-bar">
          {status === "idle" && (
            <button className="chess-btn-primary" onClick={findMatch}>Find a Match</button>
          )}
          {status === "searching" && (
            <div className="chess-searching">
              <span className="chess-searching-dot" />
              <span>Finding opponent…</span>
              <button className="chess-btn-ghost" onClick={cancelSearch}>Cancel</button>
            </div>
          )}
          {status === "playing" && (
            <div className="chess-game-bar">
              <div className="chess-color-badge">
                <span className={`chess-color-dot chess-color-dot--${myColor}`} />
                <span>{myColor === "w" ? "White" : "Black"}</span>
              </div>
              <div className={`chess-turn-indicator${isMyTurn ? " chess-turn-indicator--active" : ""}`}>
                {isMyTurn ? "Your move" : "Waiting…"}
              </div>
              <div className="chess-move-count">Move {moveCount + 1}</div>
            </div>
          )}
          {status === "finished" && (
            <div className="chess-game-bar">
              <span className="chess-winner-text">🏆 {winner} wins!</span>
              <button className="chess-btn-primary" onClick={findMatch}>Play again</button>
            </div>
          )}
        </div>

        {/* Captured pieces */}
        {(capturedW.length > 0 || capturedB.length > 0) && (
          <div className="chess-captured">
            {capturedB.length > 0 && (
              <div className="chess-captured-row">
                <span className="chess-captured-label">Black captured:</span>
                <span className="chess-captured-pieces">
                  {capturedB.map((p, i) => <span key={i}>{GLYPHS[`b_${p}`]}</span>)}
                </span>
              </div>
            )}
            {capturedW.length > 0 && (
              <div className="chess-captured-row">
                <span className="chess-captured-label">White captured:</span>
                <span className="chess-captured-pieces">
                  {capturedW.map((p, i) => <span key={i}>{GLYPHS[`w_${p}`]}</span>)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Board theme switcher */}
        <div className="chess-board-options">
          {(["classic", "slate", "walnut", "ice", "obsidian"] as const).map((t) => {
            const SWATCHES: Record<string, [string, string]> = {
              classic:  ["#f0d9b5", "#b58863"],
              slate:    ["#8ea4c8", "#4a6fa5"],
              walnut:   ["#d4b896", "#7a4f3a"],
              ice:      ["#e8eef4", "#8fa8c8"],
              obsidian: ["#4a4a5a", "#1e1e2e"],
            };
            const [light, dark] = SWATCHES[t];
            return (
              <button
                key={t}
                onClick={() => setBoardTheme(t)}
                className={`chess-board-opt${boardTheme === t ? " chess-board-opt--active" : ""}`}
              >
                <span className="chess-board-opt-swatch" style={{ background: `linear-gradient(135deg, ${light} 50%, ${dark} 50%)` }} />
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </button>
            );
          })}
        </div>

        {/* Board */}
        <div className="chess-board-wrap">
          <div className="chess-board" data-theme={boardTheme}>
            {squareElements}
          </div>
        </div>
      </main>

      <style>{`
        .chess-page {
          min-height: 100dvh;
          background: #080b12;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
          position: relative;
          overflow: hidden;
        }

        /* Glassmorphic background orbs */
        .chess-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 80% 70%, rgba(255,255,255,0.02) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .chess-page > * { position: relative; z-index: 1; }

        /* Toast */
        .chess-toast {
          position: fixed;
          top: 1rem; left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          padding: 0.6rem 1.2rem;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          animation: toast-in 0.25s cubic-bezier(.16,1,.3,1) forwards;
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
          white-space: nowrap;
        }
        .chess-toast--ok   { background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.35); color: #6ee7b7; }
        .chess-toast--err  { background: rgba(239,68,68,0.18);  border: 1px solid rgba(239,68,68,0.35);  color: #fca5a5; }
        .chess-toast--info { background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.14); color: #e2e8f0; }
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Header */
        .chess-header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(8,11,18,0.88);
          backdrop-filter: blur(16px);
          position: sticky; top: 0; z-index: 50;
        }
        .chess-brand {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.4);
          text-decoration: none; transition: color 0.15s;
        }
        .chess-brand:hover { color: #fff; }
        .chess-brand-l {
          background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.12);
          width: 1.5rem; height: 1.5rem; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800; color: #fff;
        }
        .chess-header-center { display: flex; justify-content: center; }
        .chess-title-pill { font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: 0.01em; }
        .chess-nav-link {
          font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.3);
          text-decoration: none; transition: color 0.15s; text-align: right;
        }
        .chess-nav-link:hover { color: #fff; }

        /* Main */
        .chess-main {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; padding: 1.5rem 1rem 2.5rem; gap: 1rem;
        }

        /* Status bar */
        .chess-status-bar {
          width: 100%; max-width: 520px; min-height: 44px;
          display: flex; align-items: center; justify-content: center;
        }
        .chess-btn-primary {
          background: #fff; color: #080b12; border: none;
          border-radius: 12px; padding: 0.65rem 2rem;
          font-size: 0.9rem; font-weight: 700; cursor: pointer;
          transition: all 0.18s; letter-spacing: 0.01em;
          box-shadow: 0 2px 12px rgba(255,255,255,0.15);
        }
        .chess-btn-primary:hover { background: #e2e8f0; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,255,255,0.2); }
        .chess-btn-primary:active { transform: translateY(0); }
        .chess-btn-ghost {
          background: transparent; color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
          padding: 0.35rem 0.85rem; font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .chess-btn-ghost:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
        .chess-searching {
          display: flex; align-items: center; gap: 0.65rem;
          font-size: 0.85rem; color: rgba(255,255,255,0.5);
        }
        .chess-searching-dot {
          width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.6);
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }

        .chess-game-bar {
          display: flex; align-items: center; gap: 0.75rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px; padding: 0.5rem 1rem;
          width: 100%; max-width: 520px; justify-content: space-between;
          backdrop-filter: blur(12px);
        }
        .chess-color-badge { display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.65); }
        .chess-color-dot { width:10px; height:10px; border-radius:50%; }
        .chess-color-dot--w { background:#fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.15), 0 0 8px rgba(255,255,255,0.3); }
        .chess-color-dot--b { background:#111; box-shadow: 0 0 0 2px rgba(255,255,255,0.2); }
        .chess-turn-indicator {
          font-size:0.8rem; font-weight:600; color:rgba(255,255,255,0.3);
          border-radius:999px; padding:0.2rem 0.75rem; border:1px solid transparent; transition:all 0.2s;
        }
        .chess-turn-indicator--active { color:#fff; background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.18); }
        .chess-move-count { font-size:0.76rem; color:rgba(255,255,255,0.25); font-variant-numeric:tabular-nums; }
        .chess-winner-text { font-size:0.92rem; font-weight:700; color:#fff; }

        /* Board options */
        .chess-board-options {
          display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
        }
        .chess-board-opt {
          display: flex; align-items: center; gap: 0.35rem;
          padding: 0.3rem 0.75rem; border-radius: 8px;
          font-size: 0.7rem; font-weight: 600; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); background: transparent;
          color: rgba(255,255,255,0.4); transition: all 0.15s;
        }
        .chess-board-opt:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.75); }
        .chess-board-opt--active { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.07); color: #fff; }
        .chess-board-opt-swatch {
          width: 10px; height: 10px; border-radius: 2px;
          outline: 1px solid rgba(255,255,255,0.1);
        }

        /* Captured */
        .chess-captured {
          display:flex; flex-direction:column; gap:0.2rem;
          font-size:0.75rem; color:rgba(255,255,255,0.3);
          width:100%; max-width:520px;
        }
        .chess-captured-row { display:flex; align-items:center; gap:0.4rem; }
        .chess-captured-label { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
        .chess-captured-pieces { display:flex; gap:1px; font-size:0.95rem; }

        /* Board */
        .chess-board-wrap { user-select:none; }
        .chess-board {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          width: min(90vw, 500px);
          height: min(90vw, 500px);
          border-radius: 10px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 0 0 5px rgba(255,255,255,0.04),
            0 24px 80px rgba(0,0,0,0.7),
            0 0 60px rgba(255,255,255,0.03);
        }

        .chess-square {
          position: relative;
          aspect-ratio: 1;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; padding: 0; outline: none;
          transition: filter 0.08s;
          -webkit-tap-highlight-color: transparent;
        }
        .chess-square:disabled { cursor: default; }
        .chess-square:not(:disabled):hover { filter: brightness(1.15); }

        /* Board colour themes — set by data attribute on .chess-board */
        /* Classic warm wood */
        .chess-board[data-theme="classic"] .chess-square--light { background: #f0d9b5; }
        .chess-board[data-theme="classic"] .chess-square--dark  { background: #b58863; }
        /* Slate — dark and modern */
        .chess-board[data-theme="slate"] .chess-square--light { background: #8ea4c8; }
        .chess-board[data-theme="slate"] .chess-square--dark  { background: #4a6fa5; }
        /* Walnut — dark rich brown */
        .chess-board[data-theme="walnut"] .chess-square--light { background: #d4b896; }
        .chess-board[data-theme="walnut"] .chess-square--dark  { background: #7a4f3a; }
        /* Ice — cool grey/white */
        .chess-board[data-theme="ice"] .chess-square--light { background: #e8eef4; }
        .chess-board[data-theme="ice"] .chess-square--dark  { background: #8fa8c8; }
        /* Obsidian — near black */
        .chess-board[data-theme="obsidian"] .chess-square--light { background: #4a4a5a; }
        .chess-board[data-theme="obsidian"] .chess-square--dark  { background: #1e1e2e; }

        .chess-square--selected { background: rgba(106,153,85,0.85) !important; }
        .chess-square--last-light { background: rgba(205,210,106,0.75) !important; }
        .chess-square--last-dark  { background: rgba(170,162,58,0.65) !important; }

        @keyframes anim-to {
          from { transform: scale(0.78); opacity: 0.5; }
          to   { transform: scale(1);    opacity: 1; }
        }
        .chess-square--anim-to .chess-piece { animation: anim-to 0.22s cubic-bezier(.16,1,.3,1) forwards; }
        .chess-square--anim-from { opacity: 0; }

        /* Corner labels */
        .chess-corner-rank {
          position: absolute; top: 2px; left: 3px;
          font-size: clamp(0.42rem, 1.4vw, 0.58rem); font-weight: 700;
          line-height: 1; pointer-events: none; z-index: 1;
        }
        .chess-square--light .chess-corner-rank { color: #b58863; }
        .chess-square--dark  .chess-corner-rank { color: #f0d9b5; }
        .chess-board[data-theme="slate"]    .chess-square--light .chess-corner-rank,
        .chess-board[data-theme="slate"]    .chess-square--dark  .chess-corner-rank { color: rgba(255,255,255,0.45); }
        .chess-board[data-theme="obsidian"] .chess-square--light .chess-corner-rank,
        .chess-board[data-theme="obsidian"] .chess-square--dark  .chess-corner-rank { color: rgba(255,255,255,0.35); }

        .chess-corner-file {
          position: absolute; bottom: 2px; right: 3px;
          font-size: clamp(0.42rem, 1.4vw, 0.58rem); font-weight: 700;
          line-height: 1; pointer-events: none; z-index: 1;
        }
        .chess-square--light .chess-corner-file { color: #b58863; }
        .chess-square--dark  .chess-corner-file { color: #f0d9b5; }
        .chess-board[data-theme="slate"]    .chess-square--light .chess-corner-file,
        .chess-board[data-theme="slate"]    .chess-square--dark  .chess-corner-file { color: rgba(255,255,255,0.45); }
        .chess-board[data-theme="obsidian"] .chess-square--light .chess-corner-file,
        .chess-board[data-theme="obsidian"] .chess-square--dark  .chess-corner-file { color: rgba(255,255,255,0.35); }

        /* Hints */
        .chess-hint-dot {
          position: absolute; width: 30%; height: 30%;
          border-radius: 50%; background: rgba(0,0,0,0.2);
          pointer-events: none; z-index: 2;
        }
        .chess-hint-capture {
          position: absolute; inset: 0;
          border: min(4px, 1.2vw) solid rgba(0,0,0,0.2);
          border-radius: 50%;
          pointer-events: none; z-index: 2;
        }

        /* Pieces — the KEY part: use solid dark glyphs, color them with CSS */
        .chess-piece {
          font-size: clamp(1.7rem, 9vw, 2.6rem);
          line-height: 1;
          z-index: 3; position: relative;
          display: block;
          transition: transform 0.12s;
          /* Force non-emoji rendering to get solid shapes */
          font-family: 'Segoe UI Symbol', 'Noto Chess', 'DejaVu Sans', serif;
          font-variation-settings: normal;
        }
        .chess-square:hover:not(:disabled) .chess-piece { transform: scale(1.12); }

        /* White pieces: bright white fill with strong dark outline for contrast on any square */
        .chess-piece--w {
          color: #ffffff;
          -webkit-text-stroke: 1.8px #1a1a1a;
          filter:
            drop-shadow(0 0 0 #1a1a1a)
            drop-shadow(0 1px 3px rgba(0,0,0,0.7))
            drop-shadow(0 0 8px rgba(255,255,255,0.25));
          paint-order: stroke fill;
        }
        /* Black pieces: very dark with subtle white outline */
        .chess-piece--b {
          color: #111111;
          -webkit-text-stroke: 1px rgba(255,255,255,0.15);
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
          paint-order: stroke fill;
        }

        @media (max-width: 480px) {
          .chess-header { padding: 0.6rem 0.9rem; }
          .chess-game-bar { padding: 0.35rem 0.65rem; }
          .chess-hint-capture { border-width: 3px; }
        }
      `}</style>
    </div>
  );
}
