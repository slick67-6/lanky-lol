"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";

type GameType = {
  id: string;
  title: string;
  description: string;
  category: "online" | "offline";
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
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
  },
  {
    id: "memory",
    title: "Memory Match",
    description: "Flip cards and match pairs. Test your memory skills!",
    category: "offline",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🧠",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Classic X and O game. Get three in a row to win!",
    category: "online",
    players: "2 Players",
    difficulty: "Easy",
    icon: "⭕",
  },
  {
    id: "breakout",
    title: "Breakout",
    description: "Break all the bricks with the ball. Don't let it drop!",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🧱",
  },
  {
    id: "pong",
    title: "Pong Battle",
    description: "Classic paddle game. Compete against a friend or AI!",
    category: "online",
    players: "2 Players",
    difficulty: "Medium",
    icon: "🏓",
  },
  {
    id: "whack-a-mole",
    title: "Whack-a-Mole",
    description: "Quick reflexes needed! Whack the moles as they pop up.",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔨",
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Find all mines without detonating them. Use logic and luck!",
    category: "offline",
    players: "1 Player",
    difficulty: "Hard",
    icon: "💣",
  },
  {
    id: "2048",
    title: "2048",
    description: "Slide tiles to combine numbers and reach 2048!",
    category: "offline",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🔢",
  },
  {
    id: "typing-race",
    title: "Typing Race",
    description: "Race against others to type the fastest. Online multiplayer!",
    category: "online",
    players: "Multiplayer",
    difficulty: "Medium",
    icon: "⌨️",
  },
  {
    id: "trivia",
    title: "Trivia Battle",
    description: "Answer questions faster than your opponents. Test your knowledge!",
    category: "online",
    players: "Multiplayer",
    difficulty: "Hard",
    icon: "❓",
  },
];

export default function GamesPage() {
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

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
            <p className="mb-8 text-slate-400">
              Choose from a variety of fun browser games. Some support online multiplayer!
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
                onClick={() => setFilter("online")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5 ${
                  filter === "online"
                    ? "bg-cyan-600 text-white"
                    : "border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40"
                }`}
              >
                🌐 Online
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

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
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
                </button>
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

      {selectedGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-8 shadow-2xl shadow-cyan-950/30">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-950/50 text-5xl mx-auto">
              {selectedGame.icon}
            </div>
            <h2 className="mb-3 text-center font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-50">
              {selectedGame.title}
            </h2>
            <p className="mb-6 text-center text-slate-400">{selectedGame.description}</p>
            
            <div className="mb-6 flex justify-center gap-3">
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  selectedGame.category === "online"
                    ? "bg-green-950/50 text-green-300 border border-green-500/30"
                    : "bg-blue-950/50 text-blue-300 border border-blue-500/30"
                }`}
              >
                {selectedGame.category === "online" ? "🌐 Online" : "📱 Offline"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm font-medium text-slate-300">
                {selectedGame.players}
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selectedGame.difficulty === "Easy"
                    ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                    : selectedGame.difficulty === "Medium"
                    ? "border-amber-500/30 bg-amber-950/30 text-amber-300"
                    : "border-rose-500/30 bg-rose-950/30 text-rose-300"
                }`}
              >
                {selectedGame.difficulty}
              </span>
            </div>

            {selectedGame.category === "online" ? (
              <div className="space-y-3">
                <button className="w-full rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500">
                  Find Match
                </button>
                <button className="w-full rounded-xl border border-cyan-500/30 px-6 py-3 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-950/40">
                  Create Private Room
                </button>
              </div>
            ) : (
              <button className="w-full rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500">
                Start Game
              </button>
            )}

            <button
              onClick={() => setSelectedGame(null)}
              className="mt-4 w-full rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900/50 hover:text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
