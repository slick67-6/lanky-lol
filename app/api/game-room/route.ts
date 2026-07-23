import { NextRequest, NextResponse } from "next/server";

type Room = {
  id: string;
  game: string;
  state: Record<string, unknown>;
  players: string[];
  createdAt: number;
  lastUpdate: number;
};

const rooms = new Map<string, Room>();
const ROOM_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.lastUpdate > ROOM_TTL_MS) rooms.delete(id);
  }
}, 60_000);

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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
      rooms.set(code, room);
      return NextResponse.json({ roomCode: code, room });
    }

    if (action === "join") {
      const room = rooms.get(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (room.players.length >= 2) return NextResponse.json({ error: "Room is full" }, { status: 400 });
      if (playerId && !room.players.includes(playerId)) {
        room.players.push(playerId);
      }
      room.lastUpdate = Date.now();
      return NextResponse.json({ room });
    }

    if (action === "update") {
      const room = rooms.get(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (state) {
        room.state = { ...room.state, ...state };
      }
      room.lastUpdate = Date.now();
      return NextResponse.json({ room });
    }

    if (action === "get") {
      const room = rooms.get(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}