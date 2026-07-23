"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";
import Link from "next/link";

type GameType = {
  id: string;
  title: string;
  description: string;
  category: "online" | "offline";
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
  path: string;
};

const GAMES: GameType[] = [
  {
    id: "snake",
    title: "Snake Classic",
    description: "The classic snake game - eat food, grow longer, avoid walls and yourself!",
    category: "offline",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🐍",
    path: "/games/snake",
  },
  {
    id: "memory",
    title: "Memory Match",
    description: "Flip cards and match pairs. Test your memory skills!",
    category: "offline",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🧠",
    path: "/games/memory",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Classic two-player game. Pass the phone back and forth!",
    category: "offline",
    players: "2 Players",
    difficulty: "Easy",
    icon: "⭕",
    path: "/games/tic-tac-toe",
  },
  {
    id: "breakout",
    title: "Breakout",
    description: "Break all the bricks with the ball. Don't let it drop!",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🧱",
    path: "/games/breakout",
  },
  {
    id: "pong",
    title: "Pong Battle",
    description: "Classic paddle game. Challenge the AI or play local two-player!",
    category: "offline",
    players: "1-2 Players",
    difficulty: "Medium",
    icon: "🏓",
    path: "/games/pong",
  },
  {
    id: "whack-a-mole",
    title: "Whack-a-Mole",
    description: "Quick reflexes needed! Whack the moles as they pop up.",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔨",
    path: "/games/whack-a-mole",
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Find all mines without detonating them. Use logic and luck!",
    category: "offline",
    players: "1 Player",
    difficulty: "Hard",
    icon: "💣",
    path: "/games/minesweeper",
  },
  {
    id: "2048",
    title: "2048",
    description: "Slide tiles to combine numbers and reach 2048!",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔢",
    path: "/games/2048",
  },
  {
    id: "typing-race",
    title: "Typing Race",
    description: "Type as fast as you can! Test your typing speed and accuracy.",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "⌨️",
    path: "/games/typing-race",
  },
  {
    id: "trivia",
    title: "Trivia Battle",
    description: "50 questions across science, history, tech, and more. 10 randomly selected each round!",
    category: "offline",
    players: "1 Player",
    difficulty: "Hard",
    icon: "❓",
    path: "/games/trivia",
  },
];

export default function GamesPage() {
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  const filteredGames = GAMES.filter((game) =>
    filter === "all" ? true : game.category === filter
  );

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Games" />

        <main className="flex flex-1 flex-col px-6 py-12">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              Game Collection
            </h1>
            <p className="mb-8 max-w-3xl text-slate-400">
              Choose from polished arcade, puzzle, and quiz games. All games run locally in your browser — no internet required after the page loads.
            </p>

            <div className="mb-8 flex flex-wrap gap-3">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${
                  filter === "all"
                    ? "bg-cyan-600 text-white"
                    : "border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                All Games
              </button>
              <button
                onClick={() => setFilter("offline")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${
                  filter === "offline"
                    ? "bg-cyan-600 text-white"
                    : "border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                📱 Offline
              </button>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {filteredGames.map((game) => (
                <Link
                  key={game.id}
                  href={game.path}
                  className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 text-left transition-all hover:border-cyan-400/40 hover:bg-slate-950/90 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-950/50 text-4xl shadow-inner">
                    {game.icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-cyan-100 group-hover:text-cyan-50">
                    {game.title}
                  </h3>
                  <p className="mb-4 text-sm text-slate-400 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        game.category === "online"
                          ? "bg-green-950/50 text-green-300 border border-green-500/30"
                          : "bg-blue-950/50 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {game.category === "online" ? "🌐 Online" : "📱 Offline"}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {game.players}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
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
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-12 text-center">
                <p className="text-slate-400">No games found in this category.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
