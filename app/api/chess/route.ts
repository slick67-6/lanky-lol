import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Upstash Redis HTTP client (zero extra packages — pure fetch)
// Falls back to in-process Map when env vars are absent (local dev).
// ─────────────────────────────────────────────────────────────────────────────

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) return localGet(key);
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { result } = await res.json() as { result: string | null };
  return result;
}

async function kvSet(key: string, value: string, exSeconds = 300): Promise<void> {
  if (!KV_URL || !KV_TOKEN) { localSet(key, value); return; }
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${exSeconds}`, {
    method: "GET", // Upstash REST supports GET for set
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
}

async function kvDel(key: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) { localDel(key); return; }
  await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
}

// ─── Local in-memory fallback (dev only — won't work across serverless instances) ───
const _local = new Map<string, string>();
function localGet(k: string) { return _local.get(k) ?? null; }
function localSet(k: string, v: string) { _local.set(k, v); }
function localDel(k: string) { _local.delete(k); }

// ─────────────────────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────────────────────

interface WaitingEntry { playerId: string; timestamp: number }
interface Room { players: string[]; state: Record<string, unknown> }

const WAITING_KEY = "chess:waiting"; // stores JSON WaitingEntry | null
const roomKey = (id: string) => `chess:room:${id}`;

function makeRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    action: string;
    playerId?: string;
    roomId?: string;
    state?: Record<string, unknown>;
  };
  const { action, playerId, roomId, state } = body;

  // ── matchmake ─────────────────────────────────────────────────────────────
  if (action === "matchmake" && playerId) {
    const raw = await kvGet(WAITING_KEY);
    let waiting: WaitingEntry | null = raw ? JSON.parse(raw) : null;

    // Expire stale waiters (> 45 s)
    if (waiting && Date.now() - waiting.timestamp > 45_000) {
      await kvDel(WAITING_KEY);
      waiting = null;
    }

    if (waiting && waiting.playerId !== playerId) {
      // ── Second player joins ────────────────────────────────────────────────
      const matchedRoomId = waiting.playerId.slice(-6).toUpperCase() || makeRoomId();
      await kvDel(WAITING_KEY);

      const room: Room = { players: [waiting.playerId, playerId], state: { status: "playing" } };
      await kvSet(roomKey(matchedRoomId), JSON.stringify(room));

      return NextResponse.json({ roomId: matchedRoomId, color: "b", status: "matched" });
    } else {
      // ── First player waits ─────────────────────────────────────────────────
      // Create a room now so the roomId is deterministic from the player id
      const newRoomId = playerId.slice(-6).toUpperCase() || makeRoomId();
      const entry: WaitingEntry = { playerId, timestamp: Date.now() };
      await kvSet(WAITING_KEY, JSON.stringify(entry), 60);

      const room: Room = { players: [playerId], state: {} };
      await kvSet(roomKey(newRoomId), JSON.stringify(room), 300);

      return NextResponse.json({ roomId: newRoomId, color: "w", status: "waiting" });
    }
  }

  // ── poll ──────────────────────────────────────────────────────────────────
  if (action === "poll" && roomId) {
    const raw = await kvGet(roomKey(roomId));
    if (!raw) return NextResponse.json({ status: "not_found" });
    const room: Room = JSON.parse(raw);
    return NextResponse.json({
      status: room.players.length >= 2 ? "matched" : "waiting",
      state: room.state,
      playerCount: room.players.length,
    });
  }

  // ── get ───────────────────────────────────────────────────────────────────
  if (action === "get" && roomId) {
    const raw = await kvGet(roomKey(roomId));
    if (!raw) return NextResponse.json({ status: "not_found" });
    const room: Room = JSON.parse(raw);
    return NextResponse.json({ status: "ok", state: room.state, playerCount: room.players.length });
  }

  // ── move ──────────────────────────────────────────────────────────────────
  if (action === "move" && roomId && state) {
    const raw = await kvGet(roomKey(roomId));
    if (!raw) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    const room: Room = JSON.parse(raw);
    room.state = { ...room.state, ...state };
    await kvSet(roomKey(roomId), JSON.stringify(room), 300);
    return NextResponse.json({ ok: true });
  }

  // ── cancel ────────────────────────────────────────────────────────────────
  if (action === "cancel" && roomId) {
    // Only clear the global waiting slot if it's ours
    const raw = await kvGet(WAITING_KEY);
    if (raw) {
      const waiting: WaitingEntry = JSON.parse(raw);
      if (waiting.playerId === playerId) await kvDel(WAITING_KEY);
    }
    await kvDel(roomKey(roomId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
