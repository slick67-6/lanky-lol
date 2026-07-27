"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";
import Link from "next/link";

type GameCategory = "all" | "arcade" | "puzzle" | "multiplayer";

type GameType = {
  id: string;
  title: string;
  description: string;
  category: "arcade" | "puzzle" | "multiplayer";
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
  path: string;
  badge?: string;
};

const GAMES: GameType[] = [
  {
    id: "snake",
    title: "Snake Classic",
    description: "Eat food targets, speed up, queue turns smoothly, and set high scores!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🐍",
    path: "/games/snake",
    badge: "Updated",
  },
  {
    id: "pong",
    title: "Pong Battle",
    description: "Classic paddle battle with dynamic curve angles! Play vs AI or 2P Local.",
    category: "arcade",
    players: "1-2 Players",
    difficulty: "Medium",
    icon: "🏓",
    path: "/games/pong",
  },
  {
    id: "breakout",
    title: "Breakout",
    description: "Break bricks, trigger combo multipliers, collect powerups, and clear stages!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🧱",
    path: "/games/breakout",
  },
  {
    id: "2048",
    title: "2048",
    description: "Slide tiles, combine matching numbers, use undo, and unlock 2048!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔢",
    path: "/games/2048",
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Guaranteed safe first click, 3 difficulty fields, timer, and mobile flag mode.",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Hard",
    icon: "💣",
    path: "/games/minesweeper",
  },
  {
    id: "memory",
    title: "Memory Match",
    description: "Flip cards, match identical pairs, test 3 difficulty grid sizes!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🧠",
    path: "/games/memory",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Play against Minimax AI, 2P Local, or invite friends to Online Rooms!",
    category: "multiplayer",
    players: "1-2 Players",
    difficulty: "Easy",
    icon: "⭕",
    path: "/games/tic-tac-toe",
    badge: "Online",
  },
  {
    id: "trivia",
    title: "Trivia Battle",
    description: "15s countdown rounds, randomized answers, categories, and speed streaks!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Hard",
    icon: "❓",
    path: "/games/trivia",
  },
  {
    id: "typing-race",
    title: "Typing Race",
    description: "Live WPM & CPM tracking, character highlights, quote/code snippets!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "⌨️",
    path: "/games/typing-race",
  },
  {
    id: "whack-a-mole",
    title: "Whack-a-Mole",
    description: "Reflex challenge! Golden moles (+30), trap moles (-10), and streak multipliers.",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔨",
    path: "/games/whack-a-mole",
  },
];

export default function GamesPage() {
  const [filter, setFilter] = useState<GameCategory>("all");
  const [search, setSearch] = useState("");

  const filteredGames = GAMES.filter((game) => {
    const matchesCategory = filter === "all" ? true : game.category === filter;
    const matchesSearch =
      game.title.toLowerCase().includes(search.toLowerCase()) ||
      game.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100 selection:bg-cyan-500/30">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Arcade Games" />

        <main className="flex flex-1 flex-col px-6 py-12">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300">
                <span>🎮 10 Playable Browser Games</span>
              </div>
              <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
                Arcade Collection
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                Zero-asset loading times, Web Audio API sound effects, high score saving, and full desktop & mobile touch controls.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all" as GameCategory, label: "All Games" },
                  { id: "arcade" as GameCategory, label: "🕹️ Arcade" },
                  { id: "puzzle" as GameCategory, label: "🧩 Puzzle" },
                  { id: "multiplayer" as GameCategory, label: "🌐 Multiplayer" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                      filter === tab.id
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                        : "border border-cyan-500/20 bg-slate-950/60 text-slate-300 hover:border-cyan-400/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
                className="w-full sm:w-64 rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2 text-sm text-cyan-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Games Grid */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGames.map((game) => (
                <Link
                  key={game.id}
                  href={game.path}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_35px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-3xl shadow-inner border border-cyan-500/20 group-hover:scale-110 transition-transform">
                        {game.icon}
                      </div>
                      {game.badge && (
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan-300">
                          {game.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                      {game.title}
                    </h3>
                    <p className="mb-4 text-xs leading-relaxed text-slate-400 line-clamp-2">
                      {game.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                    <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-0.5 text-[0.65rem] font-semibold text-slate-300">
                      {game.players}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold ${
                        game.difficulty === "Easy"
                          ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                          : game.difficulty === "Medium"
                          ? "border-amber-500/30 bg-amber-950/30 text-amber-300"
                          : "border-rose-500/30 bg-rose-950/30 text-rose-300"
                      }`}
                    >
                      {game.difficulty}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredGames.length === 0 && (
              <div className="rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-12 text-center backdrop-blur-xl">
                <p className="text-slate-400">No games matching your filter or search query.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
