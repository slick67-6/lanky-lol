"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { ParticlesBackground } from "@/components/particles-background";
import { useTheme } from "@/lib/theme-context";

// ─── Types ───────────────────────────────────────────────────────────────────
type PieceType  = "p" | "r" | "n" | "b" | "q" | "k";
type PieceColor = "w" | "b";
interface Piece  { type: PieceType; color: PieceColor; }
type Square      = Piece | null;
type Board       = Square[][];
type MatchStatus = "idle" | "searching" | "playing" | "finished";
type BoardTheme  = "classic" | "slate" | "walnut" | "ice" | "obsidian";

interface SlideAnim {
  piece:  Piece;
  fromX:  number; fromY: number;
  toX:    number; toY:   number;
  sqW:    number; sqH:   number; // exact square pixel dims
  dur:    number;                // ms, distance-aware
  id:     string;
}

// ─── Glyphs ──────────────────────────────────────────────────────────────────
const GLYPHS: Record<string, string> = {
  w_k: "♚", w_q: "♛", w_r: "♜", w_b: "♝", w_n: "♞", w_p: "♟",
  b_k: "♚", b_q: "♛", b_r: "♜", b_b: "♝", b_n: "♞", b_p: "♟",
};

const BOARD_SWATCHES: Record<BoardTheme, [string, string]> = {
  classic:  ["#f0d9b5", "#b58863"],
  slate:    ["#8ea4c8", "#4a6fa5"],
  walnut:   ["#d4b896", "#7a4f3a"],
  ice:      ["#e8eef4", "#8fa8c8"],
  obsidian: ["#4a4a5a", "#1e1e2e"],
};

// ─── Web Audio ───────────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) {
      _ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch { return null; }
}

type OscDef = { f: number; eF?: number; t?: OscillatorType; g: number; d: number; at?: number; };
function synth(defs: OscDef[], masterGain = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  defs.forEach(({ f, eF, t = "sine", g, d, at = 0 }) => {
    const start = now + at;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    const lim = ctx.createGain();
    lim.gain.value = masterGain;
    osc.type = t;
    osc.frequency.setValueAtTime(f, start);
    if (eF) osc.frequency.exponentialRampToValueAtTime(eF, start + d);
    vol.gain.setValueAtTime(g, start);
    vol.gain.exponentialRampToValueAtTime(0.00001, start + d + 0.01);
    osc.connect(vol); vol.connect(lim); lim.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + d + 0.02);
  });
}

// Lift / select sound — crisp wood pick-up
function sfxSelect() {
  synth([
    { f: 1400, eF: 900,  t: "sine",     g: 0.12, d: 0.07 },
    { f: 2800, eF: 1800, t: "sine",     g: 0.05, d: 0.04 },
  ]);
}

// Place / move sound — wooden thud + click
function sfxMove() {
  synth([
    { f: 160,  eF: 70,   t: "triangle", g: 0.55, d: 0.14 },
    { f: 80,   eF: 40,   t: "triangle", g: 0.30, d: 0.18 },
    { f: 2400, eF: 1200, t: "sine",     g: 0.06, d: 0.04 },
  ]);
}

// Capture — harder impact with body resonance
function sfxCapture() {
  synth([
    { f: 130,  eF: 55,   t: "sawtooth", g: 0.65, d: 0.18 },
    { f: 210,  eF: 90,   t: "triangle", g: 0.40, d: 0.14 },
    { f: 420,  eF: 200,  t: "triangle", g: 0.18, d: 0.09, at: 0.02 },
    { f: 1600, eF: 800,  t: "sine",     g: 0.08, d: 0.05 },
  ]);
}

// Game end / check — dramatic chord
function sfxCheck() {
  synth([
    { f: 440,  t: "sine", g: 0.22, d: 0.4 },
    { f: 554,  t: "sine", g: 0.16, d: 0.38, at: 0.04 },
    { f: 659,  t: "sine", g: 0.12, d: 0.36, at: 0.08 },
  ]);
}

// ─── Board helpers ────────────────────────────────────────────────────────────
function freshBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: "b" };
    b[1][c] = { type: "p",     color: "b" };
    b[6][c] = { type: "p",     color: "w" };
    b[7][c] = { type: back[c], color: "w" };
  }
  return b;
}

function isLegal(b: Board, from: [number,number], to: [number,number], color: PieceColor): boolean {
  const [fr, fc] = from; const [tr, tc] = to;
  const piece = b[fr][fc];
  if (!piece || piece.color !== color) return false;
  const target = b[tr][tc];
  if (target && target.color === color) return false;
  const dr = tr - fr, dc = tc - fc, adr = Math.abs(dr), adc = Math.abs(dc);
  if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
  function clear(sr: number, sc: number, er: number, ec: number): boolean {
    const rs = er===sr?0:er>sr?1:-1, cs = ec===sc?0:ec>sc?1:-1;
    let r = sr+rs, c = sc+cs;
    while (r!==er||c!==ec){if(b[r][c])return false;r+=rs;c+=cs;}
    return true;
  }
  switch (piece.type) {
    case "p": {
      const dir = color==="w"?-1:1, start = color==="w"?6:1;
      if (dc===0&&dr===dir&&!target) return true;
      if (dc===0&&dr===2*dir&&fr===start&&!target&&!b[fr+dir][fc]) return true;
      if (adc===1&&dr===dir&&target&&target.color!==color) return true;
      return false;
    }
    case "r": return (dr===0||dc===0)&&clear(fr,fc,tr,tc);
    case "n": return (adr===2&&adc===1)||(adr===1&&adc===2);
    case "b": return adr===adc&&clear(fr,fc,tr,tc);
    case "q": return (dr===0||dc===0||adr===adc)&&clear(fr,fc,tr,tc);
    case "k": return adr<=1&&adc<=1;
  }
}

function legalTargets(b: Board, r: number, c: number): [number,number][] {
  const piece = b[r][c]; if (!piece) return [];
  const moves: [number,number][] = [];
  for (let tr=0;tr<8;tr++) for (let tc=0;tc<8;tc++) if (isLegal(b,[r,c],[tr,tc],piece.color)) moves.push([tr,tc]);
  return moves;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ChessPage() {
  // Read global animation preference (off by default)
  const { settings } = useTheme();
  const animEnabled = settings.chessAnimations;
  // Board state
  const [board,      setBoard]      = useState<Board>(freshBoard);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    if (typeof window === "undefined") return "classic";
    const s = localStorage.getItem("chess_board_theme");
    return (s && BOARD_SWATCHES[s as BoardTheme]) ? s as BoardTheme : "classic";
  });
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("chess_sound") !== "false";
  });
  const [turn,     setTurn]     = useState<PieceColor>("w");
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [hints,    setHints]    = useState<[number,number][]>([]);
  const [lastMove, setLastMove] = useState<{from:[number,number];to:[number,number]}|null>(null);
  const [hideSq,   setHideSq]   = useState<string|null>(null);
  const [slideAnim,setSlideAnim]= useState<SlideAnim|null>(null);

  // Match state
  const [status,    setStatus]    = useState<MatchStatus>("idle");
  const [roomId,    setRoomId]    = useState("");
  const [myColor,   setMyColor]   = useState<PieceColor>("w");
  const [capturedW, setCapturedW] = useState<PieceType[]>([]);
  const [capturedB, setCapturedB] = useState<PieceType[]>([]);
  const [winner,    setWinner]    = useState<string|null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [toast,     setToast]     = useState<{msg:string;type:"ok"|"err"|"info"}|null>(null);

  const boardRef    = useRef<HTMLDivElement>(null);
  const myId        = useRef("");
  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const lastSyncRef = useRef<string>("");
  const statusRef   = useRef<MatchStatus>("idle");
  const soundRef    = useRef(soundOn);
  // moveLockRef: true immediately after WE make a move, cleared when opponent responds.
  // Using a ref (not state) so checks inside callbacks are always synchronous/fresh.
  const moveLockRef     = useRef(false);
  const [moveLocked, setMoveLocked] = useState(false);
  const moveLockTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  useEffect(() => {
    if (!myId.current) {
      myId.current = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString(36);
    }
  }, []);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function playSfx(fn: () => void) {
    if (!soundRef.current) return;
    getCtx();
    fn();
  }

  function showToast(msg: string, type: "ok"|"err"|"info" = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /** Lock the board after we make a move; auto-releases after 30s in case server goes quiet */
  function acquireMoveLock() {
    moveLockRef.current = true;
    setMoveLocked(true);
    if (moveLockTimer.current) clearTimeout(moveLockTimer.current);
    moveLockTimer.current = setTimeout(() => {
      moveLockRef.current = false;
      setMoveLocked(false);
    }, 30_000);
  }

  function releaseMoveLock() {
    if (moveLockTimer.current) clearTimeout(moveLockTimer.current);
    moveLockRef.current = false;
    setMoveLocked(false);
  }

  function changeTheme(t: BoardTheme) {
    setBoardTheme(t);
    localStorage.setItem("chess_board_theme", t);
  }
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("chess_sound", next.toString());
  }

  // ── Sliding piece animation (only runs when chessAnimations is enabled) ────
  function triggerSlide(fromR: number, fromC: number, toR: number, toC: number, piece: Piece) {
    if (!animEnabled) return; // skip if animations are disabled
    if (!boardRef.current) return;
    const fromEl = boardRef.current.querySelector<HTMLElement>(`[data-sq="${fromR}-${fromC}"]`);
    const toEl   = boardRef.current.querySelector<HTMLElement>(`[data-sq="${toR}-${toC}"]`);
    if (!fromEl || !toEl) return;
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    // Distance-aware duration: 1-square=200ms, long diagonal=290ms
    const dist = Math.hypot(toR - fromR, toC - fromC);
    const dur  = Math.round(200 + dist * 14);
    setHideSq(`${fromR}-${fromC}`);
    setSlideAnim({
      piece, id: Math.random().toString(36).slice(2),
      fromX: fr.left, fromY: fr.top,
      toX:   tr.left, toY:   tr.top,
      sqW: fr.width, sqH: fr.height,
      dur,
    });
    setTimeout(() => { setSlideAnim(null); setHideSq(null); }, dur + 30);
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!roomId) return;
    try {
      const res  = await fetch("/api/chess", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"get",roomId}) });
      const data = await res.json();
      if (statusRef.current === "searching" && data.playerCount >= 2) {
        setStatus("playing");
        showToast("Opponent connected — game on!", "ok");
      }
      const s = data.state;
      // Apply update only if it came from opponent (not our own echo)
      if (s && s.board && s.sig && s.sig !== lastSyncRef.current && s.lastPlayer !== myId.current) {
        lastSyncRef.current = s.sig;
        // Opponent moved → release our move lock so we can play again
        releaseMoveLock();
        setBoard(s.board);
        setTurn(s.turn);
        setLastMove(s.lastMove || null);
        setMoveCount(n => n + 1);
        if (s.capturedW) setCapturedW(s.capturedW);
        if (s.capturedB) setCapturedB(s.capturedB);
        if (s.winner) {
          setWinner(s.winner); setStatus("finished");
          releaseMoveLock();
          playSfx(sfxCheck);
        } else playSfx(sfxMove);
      }
    } catch {}
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      pollRef.current = setInterval(poll, 800);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [roomId, poll]);

  // ── Push move ──────────────────────────────────────────────────────────────
  const pushMove = useCallback(async (
    nb: Board, nextTurn: PieceColor,
    newLast: {from:[number,number];to:[number,number]},
    newCW: PieceType[], newCB: PieceType[],
    gw: string|null, mc: number
  ) => {
    const sig = mc.toString(36) + nextTurn;
    lastSyncRef.current = sig;
    try {
      await fetch("/api/chess", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"move", roomId, playerId:myId.current,
          state:{ board:nb, turn:nextTurn, lastMove:newLast, capturedW:newCW, capturedB:newCB, winner:gw, lastPlayer:myId.current, sig } }),
      });
    } catch {}
  }, [roomId]);

  // ── Matchmake ──────────────────────────────────────────────────────────────
  async function findMatch() {
    // Reset move lock for new game
    releaseMoveLock();
    setStatus("searching"); setBoard(freshBoard()); setTurn("w");
    setSelected(null); setHints([]); setLastMove(null);
    setSlideAnim(null); setHideSq(null);
    setCapturedW([]); setCapturedB([]); setWinner(null); setMoveCount(0);
    lastSyncRef.current = "";
    try {
      const res  = await fetch("/api/chess", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"matchmake",playerId:myId.current}) });
      const data = await res.json();
      setRoomId(data.roomId); setMyColor(data.color);
      if (data.status === "matched") {
        setStatus("playing");
        showToast(`Matched! You play ${data.color==="w"?"White":"Black"}.`, "ok");
      } else {
        showToast("Waiting for an opponent…", "info");
      }
    } catch { showToast("Connection error. Try again.", "err"); setStatus("idle"); }
  }

  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    try { await fetch("/api/chess", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"cancel",roomId,playerId:myId.current}) }); } catch {}
    setStatus("idle"); setRoomId("");
  }

  // ── Square click ──────────────────────────────────────────────────────────
  const handleSquare = useCallback((r: number, c: number) => {
    // Hard lock: if we already made a move and are waiting for opponent, block all moves
    if (moveLockRef.current) return;
    if (status !== "playing" || turn !== myColor) return;
    if (!selected) {
      const piece = board[r][c];
      if (piece?.color === myColor) {
        setSelected([r, c]);
        setHints(legalTargets(board, r, c));
        playSfx(sfxSelect);
      }
      return;
    }
    const [fr, fc] = selected;
    if (fr === r && fc === c) { setSelected(null); setHints([]); return; }
    if (isLegal(board, [fr, fc], [r, c], myColor)) {
      // Lock immediately — synchronous ref check prevents any subsequent click
      acquireMoveLock();
      const nb  = board.map(row => [...row]);
      const cap = nb[r][c];
      triggerSlide(fr, fc, r, c, nb[fr][fc]!);
      nb[r][c] = nb[fr][fc]; nb[fr][fc] = null;
      if (nb[r][c]?.type === "p" && (r===0||r===7)) nb[r][c] = { type:"q", color:myColor };
      const newCW = [...capturedW], newCB = [...capturedB];
      if (cap) {
        if (cap.color === "w") newCW.push(cap.type); else newCB.push(cap.type);
        playSfx(sfxCapture);
      } else playSfx(sfxMove);
      const nextTurn: PieceColor = turn==="w"?"b":"w";
      const newLast = { from:[fr,fc] as [number,number], to:[r,c] as [number,number] };
      let gw: string|null = null;
      if (cap?.type==="k") {
        gw = myColor==="w"?"White":"Black";
        setWinner(gw); setStatus("finished");
        // Game over — no need to wait for opponent
        releaseMoveLock();
        playSfx(sfxCheck);
      }
      setBoard(nb); setTurn(nextTurn); setLastMove(newLast); setCapturedW(newCW); setCapturedB(newCB);
      setMoveCount(n=>n+1); setSelected(null); setHints([]);
      pushMove(nb, nextTurn, newLast, newCW, newCB, gw, moveCount+1);
    } else {
      const piece = board[r][c];
      if (piece?.color === myColor) { setSelected([r,c]); setHints(legalTargets(board,r,c)); playSfx(sfxSelect); }
      else { setSelected(null); setHints([]); }
    }
  // triggerSlide reads animEnabled (stable after render) and boardRef (ref) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, selected, myColor, status, turn, capturedW, capturedB, moveCount, pushMove]);

  // ── Orientation ───────────────────────────────────────────────────────────
  // b[0]=black back rank(8), b[7]=white back rank(1)
  const ranks      = useMemo(() => myColor==="b"?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7], [myColor]);
  const files      = useMemo(() => myColor==="b"?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7], [myColor]);
  const fileLabels = useMemo(() => ["a","b","c","d","e","f","g","h"], []);

  // ── Squares ───────────────────────────────────────────────────────────────
  const squareElements = useMemo(() => {
    // canAct: our turn, game playing, and not locked waiting for opponent
    const canAct = status==="playing" && turn===myColor && !moveLocked;
    return ranks.flatMap((r, ri) =>
      files.map((c, ci) => {
        const piece   = board[r][c];
        const isLight = (ri+ci)%2===0;
        const isSel   = selected?.[0]===r && selected?.[1]===c;
        const isHint  = hints.some(([hr,hc])=>hr===r&&hc===c);
        const isFrom  = lastMove?.from[0]===r && lastMove?.from[1]===c;
        const isTo    = lastMove?.to[0]===r   && lastMove?.to[1]===c;
        const isCap   = isHint && !!piece;
        const isHide  = hideSq===`${r}-${c}`;
        const rankNum = 8-r;
        const fileLet = fileLabels[c];

        let cls = `chess-square${isLight?" chess-square--light":" chess-square--dark"}`;
        if (isSel)           cls += " chess-square--selected";
        if (isFrom||isTo)    cls += isLight?" chess-square--last-light":" chess-square--last-dark";

        return (
          <button
            key={`${r}-${c}`}
            data-sq={`${r}-${c}`}
            className={cls}
            onClick={()=>handleSquare(r,c)}
            disabled={!canAct}
            aria-label={`${fileLet}${rankNum}${piece?` ${piece.color==="w"?"white":"black"} ${piece.type}`:""}`}
          >
            {ci===0 && <span className="chess-lbl chess-lbl--rank">{rankNum}</span>}
            {ri===7 && <span className="chess-lbl chess-lbl--file">{fileLet}</span>}
            {isHint && !isCap && <span className="chess-hint-dot" />}
            {isCap            && <span className="chess-hint-ring" />}
            {piece && !isHide && (
              <span className={`chess-piece chess-piece--${piece.color}${isSel?" chess-piece--lifted":""}`}>
                {GLYPHS[`${piece.color}_${piece.type}`]}
              </span>
            )}
          </button>
        );
      })
    );
  }, [board, selected, hints, lastMove, status, turn, myColor, ranks, files, fileLabels, handleSquare, hideSq, moveLocked]);

  const isMyTurn = status==="playing" && turn===myColor && !moveLocked;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chess-page">
      <ParticlesBackground />
      {/* Sliding piece overlay — rendered outside the board grid */}
      {slideAnim && (
        <div
          key={slideAnim.id}
          className={`chess-slide-overlay chess-piece chess-piece--${slideAnim.piece.color}`}
          style={{
            left:    slideAnim.fromX,
            top:     slideAnim.fromY,
            width:   slideAnim.sqW,
            height:  slideAnim.sqH,
            "--dx":  `${slideAnim.toX - slideAnim.fromX}px`,
            "--dy":  `${slideAnim.toY - slideAnim.fromY}px`,
            "--dur": `${slideAnim.dur}ms`,
          } as React.CSSProperties}
        >
          {GLYPHS[`${slideAnim.piece.color}_${slideAnim.piece.type}`]}
        </div>
      )}

      {toast && <div className={`chess-toast chess-toast--${toast.type}`}>{toast.msg}</div>}

      <header className="chess-header">
        <Link href="/" className="chess-brand">
          <span className="chess-brand-dot">L</span>
          <span>lanky.lol</span>
        </Link>
        <div className="chess-header-center">
          <span className="chess-title">♟ Lanky Chess</span>
        </div>
        <Link href="/games" className="chess-back-link">Arcade →</Link>
      </header>

      <main className="chess-main">

        {/* ── Status ── */}
        <div className="chess-status-bar">
          {status==="idle" && (
            <button className="chess-btn-primary" onClick={findMatch}>Find a Match</button>
          )}
          {status==="searching" && (
            <div className="chess-searching">
              <span className="chess-pulse-dot" />
              <span>Finding opponent…</span>
              <button className="chess-btn-ghost" onClick={cancelSearch}>Cancel</button>
            </div>
          )}
          {status==="playing" && (
            <div className="chess-game-bar">
              <div className="chess-color-badge">
                <span className={`chess-color-dot chess-color-dot--${myColor}`} />
                <span>{myColor==="w"?"White":"Black"}</span>
              </div>
              <div className={`chess-turn${isMyTurn?" chess-turn--active":moveLocked?" chess-turn--sent":""}`}>
                {isMyTurn ? "Your move" : moveLocked ? <><span className="chess-pulse-dot chess-pulse-dot--sm" />Sent…</> : "Opponent's turn"}
              </div>
              <div className="chess-move-no">Move {moveCount+1}</div>
            </div>
          )}
          {status==="finished" && (
            <div className="chess-game-bar">
              <span className="chess-winner">🏆 {winner} wins!</span>
              <button className="chess-btn-primary" onClick={findMatch}>Play again</button>
            </div>
          )}
        </div>

        {/* ── Captured ── */}
        {(capturedW.length>0||capturedB.length>0) && (
          <div className="chess-captured">
            {capturedB.length>0 && (
              <div className="chess-cap-row">
                <span className="chess-cap-lbl">B:</span>
                <span>{capturedB.map((p,i)=><span key={i}>{GLYPHS[`b_${p}`]}</span>)}</span>
              </div>
            )}
            {capturedW.length>0 && (
              <div className="chess-cap-row">
                <span className="chess-cap-lbl">W:</span>
                <span>{capturedW.map((p,i)=><span key={i}>{GLYPHS[`w_${p}`]}</span>)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Board ── */}
        <div className="chess-board-wrap">
          <div className="chess-board" data-theme={boardTheme} ref={boardRef}>
            {squareElements}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="chess-controls">
          <div className="chess-theme-row">
            {(Object.keys(BOARD_SWATCHES) as BoardTheme[]).map(t => {
              const [l, d] = BOARD_SWATCHES[t];
              return (
                <button
                  key={t}
                  onClick={()=>changeTheme(t)}
                  title={t}
                  className={`chess-theme-btn${boardTheme===t?" chess-theme-btn--on":""}`}
                >
                  <span className="chess-theme-swatch" style={{background:`linear-gradient(135deg,${l} 50%,${d} 50%)`}} />
                  <span className="chess-theme-label">{t}</span>
                </button>
              );
            })}
          </div>
          <button onClick={toggleSound} className="chess-sound-toggle" title={soundOn?"Mute":"Sound on"}>
            {soundOn?"🔊":"🔇"}
          </button>
        </div>
      </main>

      {/* ── All CSS inlined for isolation ─────────────────────────────────── */}
      <style>{`
        /* Page — transparent so ParticlesBackground shows through */
        .chess-page {
          min-height: 100dvh;
          background: transparent;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
          position: relative;
        }
        .chess-page > * { position:relative; z-index:1; }

        /* ── Sliding overlay ─────────────────────────────────────────────── */
        .chess-slide-overlay {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: piece-slide var(--dur, 240ms) cubic-bezier(0.22,1.15,0.36,1) forwards;
          will-change: transform;
        }
        @keyframes piece-slide {
          0%   { transform: translate(0,0) scale(1.08); }
          85%  { transform: translate(calc(var(--dx)*1.03), calc(var(--dy)*1.03)) scale(1.0); }
          100% { transform: translate(var(--dx), var(--dy)) scale(1); }
        }

        /* ── Toast ── */
        .chess-toast {
          position:fixed; top:1rem; left:50%;
          transform:translateX(-50%); z-index:100;
          padding:0.55rem 1.1rem; border-radius:999px;
          font-size:0.8rem; font-weight:600;
          backdrop-filter:blur(16px);
          box-shadow:0 4px 24px rgba(0,0,0,0.5);
          white-space:nowrap;
          animation:toast-in 0.22s cubic-bezier(.16,1,.3,1) forwards;
        }
        .chess-toast--ok   { background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.35); color:#6ee7b7; }
        .chess-toast--err  { background:rgba(239,68,68,0.18);  border:1px solid rgba(239,68,68,0.35);  color:#fca5a5; }
        .chess-toast--info { background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.14);color:#e2e8f0; }
        @keyframes toast-in {
          from { opacity:0; transform:translateX(-50%) translateY(-8px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }

        /* ── Header ── */
        .chess-header {
          display:grid; grid-template-columns:1fr auto 1fr;
          align-items:center; padding:0.7rem 1.2rem;
          border-bottom:1px solid rgba(255,255,255,0.07);
          background:rgba(8,11,18,0.9); backdrop-filter:blur(16px);
          position:sticky; top:0; z-index:50;
        }
        .chess-brand {
          display:flex; align-items:center; gap:0.45rem;
          font-size:0.8rem; font-weight:600; color:rgba(255,255,255,0.4);
          text-decoration:none; transition:color 0.15s;
        }
        .chess-brand:hover { color:#fff; }
        .chess-brand-dot {
          background:rgba(255,255,255,0.09); border:1px solid rgba(255,255,255,0.12);
          width:1.4rem; height:1.4rem; border-radius:6px;
          display:flex; align-items:center; justify-content:center;
          font-size:0.72rem; font-weight:800; color:#fff;
        }
        .chess-header-center { display:flex; justify-content:center; }
        .chess-title { font-size:0.85rem; font-weight:700; color:rgba(255,255,255,0.85); letter-spacing:0.01em; }
        .chess-back-link {
          font-size:0.76rem; font-weight:600; color:rgba(255,255,255,0.28);
          text-decoration:none; transition:color 0.15s; text-align:right;
        }
        .chess-back-link:hover { color:#fff; }

        /* ── Main layout ── */
        .chess-main {
          flex:1; display:flex; flex-direction:column;
          align-items:center; gap:0.65rem;
          padding:0.75rem 0.5rem 1rem;
        }

        /* ── Status ── */
        .chess-status-bar {
          width:100%; max-width:580px; min-height:42px;
          display:flex; align-items:center; justify-content:center;
        }
        .chess-btn-primary {
          background:#fff; color:#080b12; border:none;
          border-radius:12px; padding:0.6rem 2rem;
          font-size:0.88rem; font-weight:700; cursor:pointer;
          transition:all 0.18s; letter-spacing:0.01em;
          box-shadow:0 2px 18px rgba(255,255,255,0.18);
        }
        .chess-btn-primary:hover { background:#e8ecf0; transform:translateY(-1px); box-shadow:0 4px 26px rgba(255,255,255,0.22); }
        .chess-btn-primary:active { transform:translateY(0); }
        .chess-btn-ghost {
          background:transparent; color:rgba(255,255,255,0.4);
          border:1px solid rgba(255,255,255,0.14); border-radius:8px;
          padding:0.3rem 0.8rem; font-size:0.74rem; font-weight:600;
          cursor:pointer; transition:all 0.15s;
        }
        .chess-btn-ghost:hover { color:#fff; border-color:rgba(255,255,255,0.32); }
        .chess-searching {
          display:flex; align-items:center; gap:0.6rem;
          font-size:0.84rem; color:rgba(255,255,255,0.5);
        }
        .chess-pulse-dot {
          width:7px; height:7px; border-radius:50%;
          background:rgba(255,255,255,0.65);
          animation:pulse-dot 1.2s ease-in-out infinite;
        }
        @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.2} }

        .chess-game-bar {
          display:flex; align-items:center; gap:0.65rem;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);
          border-radius:14px; padding:0.45rem 0.9rem;
          width:100%; max-width:580px; justify-content:space-between;
          backdrop-filter:blur(12px);
        }
        .chess-color-badge { display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; font-weight:600; color:rgba(255,255,255,0.65); }
        .chess-color-dot   { width:9px; height:9px; border-radius:50%; }
        .chess-color-dot--w { background:#fff; box-shadow:0 0 0 2px rgba(255,255,255,0.15),0 0 8px rgba(255,255,255,0.3); }
        .chess-color-dot--b { background:#111; box-shadow:0 0 0 2px rgba(255,255,255,0.25); }
        .chess-turn {
          display:flex; align-items:center; gap:0.35rem;
          font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.28);
          border-radius:999px; padding:0.18rem 0.7rem; border:1px solid transparent; transition:all 0.25s;
        }
        .chess-turn--active { color:#fff; background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.18); }
        .chess-turn--sent   { color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1); }
        .chess-pulse-dot--sm {
          width:5px; height:5px; border-radius:50%;
          background:rgba(255,255,255,0.5);
          animation:pulse-dot 1s ease-in-out infinite;
          flex-shrink:0;
        }
        .chess-move-no { font-size:0.74rem; color:rgba(255,255,255,0.24); font-variant-numeric:tabular-nums; }
        .chess-winner  { font-size:0.9rem; font-weight:700; color:#fff; }

        /* ── Captured ── */
        .chess-captured {
          display:flex; gap:0.7rem; flex-wrap:wrap;
          font-size:0.72rem; color:rgba(255,255,255,0.28);
          width:100%; max-width:580px; justify-content:center;
        }
        .chess-cap-row { display:flex; align-items:center; gap:0.25rem; }
        .chess-cap-lbl { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }

        /* ── Board wrap ── */
        .chess-board-wrap {
          user-select:none;
          display:flex; align-items:center; justify-content:center;
          width:100%;
        }

        /* ── Board ── */
        .chess-board {
          display:grid;
          grid-template-columns:repeat(8,1fr);
          /* Explicit rows so the board is always perfectly square across all devices */
          grid-template-rows:repeat(8,1fr);
          /* Fill as much space as available, capped at 580px, responsive to height */
          width:  min(calc(100vw - 12px), calc(100dvh - 230px), 580px);
          height: min(calc(100vw - 12px), calc(100dvh - 230px), 580px);
          border-radius:10px;
          overflow:hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 0 0 5px rgba(255,255,255,0.04),
            0 32px 100px rgba(0,0,0,0.8),
            0 0 80px rgba(255,255,255,0.025);
        }

        /* ── Square — NO overflow:hidden so scaled/lifted pieces don't clip ── */
        .chess-square {
          position:relative;
          aspect-ratio:1;
          display:flex; align-items:center; justify-content:center;
          border:none; cursor:pointer; padding:0; outline:none;
          transition:filter 0.07s;
          -webkit-tap-highlight-color:transparent;
          /* overflow intentionally removed — board clip handles corners */
        }
        .chess-square:disabled { cursor:default; }
        .chess-square:not(:disabled):hover { filter:brightness(1.13); }

        /* Board colour themes */
        .chess-board[data-theme="classic"] .chess-square--light { background:#f0d9b5; }
        .chess-board[data-theme="classic"] .chess-square--dark  { background:#b58863; }
        .chess-board[data-theme="slate"]   .chess-square--light { background:#8ea4c8; }
        .chess-board[data-theme="slate"]   .chess-square--dark  { background:#4a6fa5; }
        .chess-board[data-theme="walnut"]  .chess-square--light { background:#d4b896; }
        .chess-board[data-theme="walnut"]  .chess-square--dark  { background:#7a4f3a; }
        .chess-board[data-theme="ice"]     .chess-square--light { background:#e8eef4; }
        .chess-board[data-theme="ice"]     .chess-square--dark  { background:#8fa8c8; }
        .chess-board[data-theme="obsidian"].chess-square--light { background:#4a4a5a; }
        .chess-board[data-theme="obsidian"].chess-square--dark  { background:#1e1e2e; }

        .chess-square--selected   { background:rgba(106,153,85,0.92) !important; }
        .chess-square--last-light { background:rgba(205,210,106,0.80) !important; }
        .chess-square--last-dark  { background:rgba(170,162,58,0.70)  !important; }

        /* ── Coordinate labels ── */
        .chess-lbl {
          position:absolute; font-weight:700; line-height:1;
          pointer-events:none; z-index:1;
          font-size:clamp(0.34rem, 1.1vw, 0.52rem);
          opacity:0.7;
        }
        .chess-lbl--rank { top:2px; left:3px; }
        .chess-lbl--file { bottom:2px; right:3px; }
        .chess-square--light .chess-lbl { color:#b58863; }
        .chess-square--dark  .chess-lbl { color:#f0d9b5; }
        .chess-board[data-theme="slate"]    .chess-lbl,
        .chess-board[data-theme="obsidian"] .chess-lbl { color:rgba(255,255,255,0.45); }

        /* ── Move hint: empty square dot ── */
        .chess-hint-dot {
          position:absolute;
          width:30%; height:30%;
          border-radius:50%;
          background:rgba(0,0,0,0.22);
          pointer-events:none; z-index:2;
          animation:hint-pop 0.18s cubic-bezier(0.34,1.8,0.64,1) both;
        }
        /* ── Move hint: capture ring ── */
        .chess-hint-ring {
          position:absolute; inset:0;
          border-radius:50%;
          border:min(5px,1.5vw) solid rgba(0,0,0,0.22);
          pointer-events:none; z-index:2;
          animation:hint-pop 0.18s cubic-bezier(0.34,1.8,0.64,1) both,
                    hint-pulse 1.6s ease-in-out 0.2s infinite;
        }
        @keyframes hint-pop {
          0%   { transform:scale(0);    opacity:0; }
          60%  { transform:scale(1.12); opacity:1; }
          100% { transform:scale(1);    opacity:1; }
        }
        @keyframes hint-pulse {
          0%,100% { opacity:1; }
          50%     { opacity:0.6; }
        }

        /* ── Pieces ── */
        .chess-piece {
          /* Responsive to board size which is min(100vw-12px, 580px) */
          /* Square = board/8 = min((100vw-12px)/8, 72.5px) */
          /* Piece ≈ 80% of square */
          font-size: clamp(1.55rem, calc((100vw - 12px) * 0.093), 3.9rem);
          line-height:1; z-index:3; position:relative;
          display:block; will-change:transform;
          transition:transform 0.14s cubic-bezier(0.34,1.56,0.64,1),
                     filter 0.1s;
          font-family:'Segoe UI Symbol','Noto Chess','DejaVu Sans',serif;
        }
        .chess-square:hover:not(:disabled) .chess-piece { transform:scale(1.1); }

        /* Lifted/selected piece — scale only, no translateY that clips outside square */
        .chess-piece--lifted {
          transform: scale(1.25) !important;
          filter: drop-shadow(0 4px 14px rgba(0,0,0,0.75)) drop-shadow(0 0 18px rgba(255,255,255,0.2));
          z-index: 10;
        }

        /* White piece */
        .chess-piece--w {
          color:#ffffff;
          -webkit-text-stroke:1.8px #1a1a1a;
          filter:
            drop-shadow(0 0 0 #1a1a1a)
            drop-shadow(0 1.5px 4px rgba(0,0,0,0.8))
            drop-shadow(0 0 10px rgba(255,255,255,0.18));
          paint-order:stroke fill;
        }
        /* Black piece */
        .chess-piece--b {
          color:#111111;
          -webkit-text-stroke:0.8px rgba(255,255,255,0.1);
          filter:drop-shadow(0 1.5px 4px rgba(0,0,0,0.7));
          paint-order:stroke fill;
        }

        /* ── Controls ── */
        .chess-controls {
          display:flex; align-items:center; gap:0.6rem;
          width:100%; max-width:580px; flex-wrap:wrap; justify-content:space-between;
        }
        .chess-theme-row { display:flex; gap:0.35rem; flex-wrap:wrap; }
        .chess-theme-btn {
          display:flex; align-items:center; gap:0.28rem;
          padding:0.24rem 0.55rem; border-radius:7px;
          font-size:0.62rem; font-weight:600; cursor:pointer;
          border:1px solid rgba(255,255,255,0.1); background:transparent;
          color:rgba(255,255,255,0.38); transition:all 0.14s;
        }
        .chess-theme-btn:hover { border-color:rgba(255,255,255,0.24); color:rgba(255,255,255,0.75); }
        .chess-theme-btn--on   { border-color:rgba(255,255,255,0.42); background:rgba(255,255,255,0.08); color:#fff; }
        .chess-theme-swatch { width:9px; height:9px; border-radius:2px; outline:1px solid rgba(255,255,255,0.1); flex-shrink:0; }
        .chess-theme-label  { text-transform:capitalize; }
        .chess-sound-toggle {
          background:transparent; border:1px solid rgba(255,255,255,0.1);
          border-radius:7px; padding:0.24rem 0.45rem; font-size:0.95rem;
          cursor:pointer; transition:all 0.14s; opacity:0.5;
          flex-shrink:0;
        }
        .chess-sound-toggle:hover { opacity:0.85; border-color:rgba(255,255,255,0.26); }

        /* ── Mobile tweaks ── */
        @media (max-width:480px) {
          .chess-header { padding:0.5rem 0.8rem; }
          .chess-main   { gap:0.5rem; padding:0.5rem 0.25rem 0.75rem; }
          .chess-game-bar { padding:0.3rem 0.55rem; }
          .chess-theme-btn { padding:0.2rem 0.42rem; font-size:0.58rem; }
          .chess-controls { gap:0.4rem; }
          /* On very small phones, squeeze a little more */
          .chess-board {
            width:  min(calc(100vw - 8px), calc(100dvh - 210px), 580px);
            height: min(calc(100vw - 8px), calc(100dvh - 210px), 580px);
          }
        }
        @media (max-width:360px) {
          .chess-theme-label { display:none; }
          .chess-theme-swatch { width:12px; height:12px; }
        }
      `}</style>
    </div>
  );
}
