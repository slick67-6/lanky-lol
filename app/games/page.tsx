"use client";

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
  { id: "snake",        title: "Snake",         description: "Eat, grow, avoid walls",          category: "arcade",      players: "1P",   difficulty: "Easy",   icon: "🐍", path: "/games/snake" },
  { id: "pong",         title: "Pong",           description: "Paddle battle vs AI or friend",   category: "arcade",      players: "1–2P", difficulty: "Medium", icon: "🏓", path: "/games/pong" },
  { id: "breakout",     title: "Breakout",       description: "Smash bricks, collect powerups",  category: "arcade",      players: "1P",   difficulty: "Medium", icon: "🧱", path: "/games/breakout" },
  { id: "flappy-bird",  title: "Flappy Bird",    description: "Tap to flap, dodge the pipes",    category: "arcade",      players: "1P",   difficulty: "Medium", icon: "🐦", path: "/games/flappy-bird" },
  { id: "aim-trainer",  title: "Aim Trainer",    description: "Click shrinking targets fast",     category: "arcade",      players: "1P",   difficulty: "Medium", icon: "🎯", path: "/games/aim-trainer" },
  { id: "whack-a-mole", title: "Whack-a-Mole",  description: "Reflexes, multipliers, traps",    category: "arcade",      players: "1P",   difficulty: "Medium", icon: "🔨", path: "/games/whack-a-mole" },
  { id: "reaction-test",title: "Reaction Test",  description: "Click when it goes green",        category: "arcade",      players: "1P",   difficulty: "Easy",   icon: "⚡", path: "/games/reaction-test" },
  { id: "typing-race",  title: "Typing Race",    description: "Raw WPM speed test",              category: "arcade",      players: "1P",   difficulty: "Medium", icon: "⌨️", path: "/games/typing-race", badge: "Monkeytype" },
  { id: "2048",         title: "2048",           description: "Slide tiles, reach 2048",         category: "puzzle",      players: "1P",   difficulty: "Medium", icon: "🔢", path: "/games/2048" },
  { id: "minesweeper",  title: "Minesweeper",    description: "Safe first click, 3 difficulties", category: "puzzle",     players: "1P",   difficulty: "Hard",   icon: "💣", path: "/games/minesweeper" },
  { id: "memory",       title: "Memory Match",   description: "Flip and match card pairs",        category: "puzzle",     players: "1P",   difficulty: "Easy",   icon: "🧠", path: "/games/memory" },
  { id: "trivia",       title: "Trivia",         description: "15s rounds, speed streaks",        category: "puzzle",     players: "1P",   difficulty: "Hard",   icon: "❓", path: "/games/trivia" },
  { id: "tetris",       title: "Tetris",         description: "Rotate blocks, clear lines",       category: "puzzle",     players: "1P",   difficulty: "Hard",   icon: "🧩", path: "/games/tetris" },
  { id: "simon-says",   title: "Simon Says",     description: "Remember the sequence",            category: "puzzle",     players: "1P",   difficulty: "Easy",   icon: "🔔", path: "/games/simon-says" },
  { id: "hangman",      title: "Hangman",        description: "Guess the word in 6 tries",        category: "puzzle",     players: "1P",   difficulty: "Medium", icon: "📝", path: "/games/hangman" },
  { id: "tic-tac-toe",  title: "Tic-Tac-Toe",   description: "Minimax AI or 2-player local",     category: "multiplayer", players: "1–2P", difficulty: "Easy",   icon: "⭕", path: "/games/tic-tac-toe" },
  { id: "connect-four", title: "Connect Four",   description: "Drop discs, connect 4 in a row",  category: "multiplayer", players: "2P",   difficulty: "Easy",   icon: "🔴", path: "/games/connect-four" },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-400  bg-amber-500/10  border-amber-500/20",
  Hard:   "text-rose-400   bg-rose-500/10   border-rose-500/20",
};

const FILTERS: { id: GameCategory; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "arcade",      label: "Arcade" },
  { id: "puzzle",      label: "Puzzle" },
  { id: "multiplayer", label: "2-Player" },
  { id: "favorites",   label: "Saved" },
];

export default function GamesPage() {
  const [filter, setFilter] = useState<GameCategory>("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteGames());
  const router = useRouter();

  const handleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteGame(id);
    setFavorites(getFavoriteGames());
  };

  const launchRandom = () => {
    const g = GAMES[Math.floor(Math.random() * GAMES.length)];
    recordRecentlyPlayed(g.id);
    router.push(g.path);
  };

  const filtered = GAMES.filter((g) => {
    if (filter === "favorites") return favorites.includes(g.id);
    const cat = filter === "all" || g.category === filter;
    const q = search.toLowerCase();
    const match = !q || g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    return cat && match;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[#030712] text-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Arcade</h1>
            <p className="mt-1 text-sm text-white/35">{GAMES.length} browser games — no downloads, no accounts</p>
          </div>
          <button
            onClick={launchRandom}
            className="shrink-0 self-start rounded-xl border border-white/[0.09] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white sm:self-auto"
          >
            ↻ Random
          </button>
        </div>

        {/* Filters + search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  filter === f.id
                    ? "bg-white text-[#030712]"
                    : "border border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/15 hover:text-white/70"
                }`}
              >
                {f.label}
                {f.id === "favorites" && favorites.length > 0 && (
                  <span className="ml-1.5 opacity-60">{favorites.length}</span>
                )}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-xs text-white placeholder:text-white/25 focus:border-white/20 focus:outline-none sm:w-44"
          />
        </div>

        {/* Grid */}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game) => {
            const isFav = favorites.includes(game.id);
            return (
              <Link
                key={game.id}
                href={game.path}
                onClick={() => recordRecentlyPlayed(game.id)}
                className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {/* Icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.05] text-2xl transition-transform duration-200 group-hover:scale-105">
                  {game.icon}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
                      {game.title}
                    </h3>
                    {game.badge && (
                      <span className="shrink-0 rounded-full border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white/40">
                        {game.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/30">{game.description}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[0.65rem] font-medium text-white/25">{game.players}</span>
                    <span className="text-white/15">·</span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[0.6rem] font-semibold ${DIFFICULTY_STYLE[game.difficulty]}`}>
                      {game.difficulty}
                    </span>
                  </div>
                </div>

                {/* Fav button */}
                <button
                  onClick={(e) => handleFav(e, game.id)}
                  aria-label={isFav ? "Remove from saved" : "Save game"}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-base text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:text-white/60"
                >
                  {isFav ? "★" : "☆"}
                </button>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-sm text-white/25">No games match your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
