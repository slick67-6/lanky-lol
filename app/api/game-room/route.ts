import { NextRequest, NextResponse } from "next/server";

type Room = {
  id: string;
  game: string;
  state: Record<string, unknown>;
  players: string[];
  createdAt: number;
  lastUpdate: number;
};

const localRooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function kvGetRoom(code: string): Promise<Room | null> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/get/room_${code}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
        }
      }
    } catch {}
  }
  return localRooms.get(code) || null;
}

async function kvSetRoom(code: string, room: Room): Promise<void> {
  localRooms.set(code, room);

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/set/room_${code}?EX=3600`, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(JSON.stringify(room)),
      });
    } catch {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomCode, game, playerId, state } = body;

    if (action === "create") {
      const code = generateRoomCode();
      const room: Room = {
        id: code,
        game: game || "unknown",
        state: {},
        players: [playerId || "player1"],
        createdAt: Date.now(),
        lastUpdate: Date.now(),
      };
      await kvSetRoom(code, room);
      return NextResponse.json({ roomCode: code, room });
    }

    if (action === "join") {
      const room = await kvGetRoom(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (room.players.length >= 2 && !room.players.includes(playerId)) {
        return NextResponse.json({ error: "Room is full" }, { status: 400 });
      }
      if (playerId && !room.players.includes(playerId)) {
        room.players.push(playerId);
      }
      room.lastUpdate = Date.now();
      await kvSetRoom(roomCode, room);
      return NextResponse.json({ room });
    }

    if (action === "update") {
      const room = await kvGetRoom(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (state) {
        room.state = { ...room.state, ...state };
      }
      room.lastUpdate = Date.now();
      await kvSetRoom(roomCode, room);
      return NextResponse.json({ room });
    }

    if (action === "get") {
      const room = await kvGetRoom(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}