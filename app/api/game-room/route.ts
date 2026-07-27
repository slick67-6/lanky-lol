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
let waitingChessRoomId: string | null = null;

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

    // Automatic Quick Matchmaking for Chess
    if (action === "matchmake") {
      if (waitingChessRoomId) {
        const existingRoom = await kvGetRoom(waitingChessRoomId);
        if (existingRoom && existingRoom.players.length === 1 && !existingRoom.players.includes(playerId)) {
          existingRoom.players.push(playerId);
          existingRoom.state.status = "playing";
          existingRoom.lastUpdate = Date.now();
          await kvSetRoom(existingRoom.id, existingRoom);
          const currentWaitingId = waitingChessRoomId;
          waitingChessRoomId = null;
          return NextResponse.json({ roomCode: currentWaitingId, room: existingRoom, color: "b" });
        }
      }

      // Create a waiting room
      const code = generateRoomCode();
      const newRoom: Room = {
        id: code,
        game: game || "chess",
        state: { status: "waiting" },
        players: [playerId],
        createdAt: Date.now(),
        lastUpdate: Date.now(),
      };
      waitingChessRoomId = code;
      await kvSetRoom(code, newRoom);
      return NextResponse.json({ roomCode: code, room: newRoom, color: "w" });
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