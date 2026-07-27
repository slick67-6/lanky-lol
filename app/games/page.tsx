"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFavoriteGames, toggleFavoriteGame, recordRecentlyPlayed } from "@/lib/achievements";

type GameCategory = "all" | "arcade" | "puzzle" | "multiplayer" | "favorites";

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
    description: "Play against Minimax AI or 2P Local mode!",
    category: "multiplayer",
    players: "1-2 Players",
    difficulty: "Easy",
    icon: "⭕",
    path: "/games/tic-tac-toe",
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
    title: "Typing Race (Monkeytype)",
    description: "Raw typing test, immediate finish, carets, word counts, and WPM history!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "⌨️",
    path: "/games/typing-race",
    badge: "Monkeytype",
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
  {
    id: "flappy-bird",
    title: "Flappy Bird",
    description: "Tap or spacebar to flap wings, dodge pipes, and test high-score reflexes!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🐦",
    path: "/games/flappy-bird",
  },
  {
    id: "tetris",
    title: "Tetris Block Blast",
    description: "Rotate tetrominoes, clear grid lines, score multipliers, and soft/hard drops!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Hard",
    icon: "🧩",
    path: "/games/tetris",
  },
  {
    id: "aim-trainer",
    title: "Aim Trainer Precision",
    description: "Click shrinking targets in 30 seconds, track precision accuracy & reaction delay!",
    category: "arcade",
    players: "1 Player",
    difficulty: "Medium",
    icon: "🎯",
    path: "/games/aim-trainer",
  },
  {
    id: "reaction-test",
    title: "Reaction Time Test",
    description: "Nervous system speed test! Click instantly when red transitions to green.",
    category: "arcade",
    players: "1 Player",
    difficulty: "Easy",
    icon: "⚡",
    path: "/games/reaction-test",
  },
  {
    id: "simon-says",
    title: "Simon Says Sequence",
    description: "Memorize and repeat glowing sound sequences as they grow longer every round!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Easy",
    icon: "🔔",
    path: "/games/simon-says",
  },
  {
    id: "connect-four",
    title: "Connect Four",
    description: "Drop discs into 7 columns to connect 4 in a row horizontally or vertically!",
    category: "multiplayer",
    players: "2 Players",
    difficulty: "Easy",
    icon: "🔴",
    path: "/games/connect-four",
  },
  {
    id: "hangman",
    title: "Hangman Word Challenge",
    description: "Guess hidden developer & tech words before 6 allowed wrong attempts!",
    category: "puzzle",
    players: "1 Player",
    difficulty: "Medium",
    icon: "📝",
    path: "/games/hangman",
  },
];

export default function GamesPage() {
  const [filter, setFilter] = useState<GameCategory>("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteGames());
  const router = useRouter();

  const handleFavoriteClick = (e: React.MouseEvent, gameId: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteGame(gameId);
    setFavorites(getFavoriteGames());
  };

  const launchRandomGame = () => {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    recordRecentlyPlayed(randomGame.id);
    router.push(randomGame.path);
  };

  const filteredGames = GAMES.filter((game) => {
    if (filter === "favorites") {
      return favorites.includes(game.id);
    }
    const matchesCategory = filter === "all" ? true : game.category === filter;
    const matchesSearch =
      game.title.toLowerCase().includes(search.toLowerCase()) ||
      game.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100 selection:bg-cyan-500/30 font-sans">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Arcade Games Collection" />

        <main className="flex flex-1 flex-col px-6 py-12">
          <div className="mx-auto w-full max-w-6xl">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-sans text-3xl font-bold text-cyan-50 sm:text-4xl">
                  Arcade Games Collection
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                  17 browser arcade games with sound effects, high scores, and touch controls.
                </p>
              </div>

              <button
                onClick={launchRandomGame}
                className="shrink-0 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
              >
                🎲 Random Game
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all" as GameCategory, label: "All Games" },
                  { id: "arcade" as GameCategory, label: "🕹️ Arcade" },
                  { id: "puzzle" as GameCategory, label: "🧩 Puzzle" },
                  { id: "multiplayer" as GameCategory, label: "👥 2-Player Local" },
                  { id: "favorites" as GameCategory, label: `⭐ Favorites (${favorites.length})` },
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
              {filteredGames.map((game) => {
                const isFav = favorites.includes(game.id);
                return (
                  <Link
                    key={game.id}
                    href={game.path}
                    onClick={() => recordRecentlyPlayed(game.id)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_35px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-3xl shadow-inner border border-cyan-500/20 group-hover:scale-110 transition-transform">
                          {game.icon}
                        </div>

                        <div className="flex items-center gap-2">
                          {game.badge && (
                            <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan-300">
                              {game.badge}
                            </span>
                          )}
                          <button
                            onClick={(e) => handleFavoriteClick(e, game.id)}
                            className="text-lg transition-transform hover:scale-125"
                            aria-label={isFav ? "Remove favorite" : "Add favorite"}
                          >
                            {isFav ? "⭐" : "☆"}
                          </button>
                        </div>
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
                );
              })}
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
