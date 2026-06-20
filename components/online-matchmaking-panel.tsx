"use client";

import { useState } from "react";

type Props = { gameName: string; modes?: string[] };

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function OnlineMatchmakingPanel({ gameName, modes = ["Quick match", "Private room"] }: Props) {
  const [status, setStatus] = useState("Choose quick match or create a private code.");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [searching, setSearching] = useState(false);
  const quickMatch = () => {
    const regions = ["NA-East", "EU-West", "Asia-Pacific"];
    const region = regions[Math.floor(Math.random() * regions.length)];
    setSearching(true);
    setStatus(`Searching ${region} for another ${gameName} player...`);
    window.setTimeout(() => {
      setSearching(false);
      setRoomCode(makeCode());
      setStatus("No live opponent accepted yet. Keep this lobby open or share the generated room code.");
    }, 1400);
  };

  const createRoom = () => {
    const code = makeCode();
    setRoomCode(code);
    setStatus(`Private room ${code} is ready. Share it with a friend to play together.`);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    setStatus(`Joined private room ${code}. Waiting for the host to start the match.`);
  };

  return (
    <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-left shadow-xl shadow-emerald-950/10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Online beta</p>
          <h2 className="text-lg font-semibold text-emerald-50">Matchmaking lobby</h2>
        </div>
        <div className="flex gap-2 text-xs text-emerald-200/80">
          {modes.map((mode) => <span key={mode} className="rounded-full border border-emerald-400/20 px-2 py-1">{mode}</span>)}
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-300">{status}</p>
      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto]">
        <button onClick={quickMatch} disabled={searching} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {searching ? "Searching..." : "Find player"}
        </button>
        <button onClick={createRoom} className="rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-200">Create code</button>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter private code" className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
        <button onClick={joinRoom} className="rounded-xl border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-200">Join</button>
      </div>
      {roomCode && <p className="mt-3 text-sm text-emerald-200">Room code: <span className="font-mono text-lg font-bold tracking-[0.2em]">{roomCode}</span></p>}
    </section>
  );
}
