"use client";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_play", title: "Arcade Debut", description: "Play your very first arcade game on lanky.lol", icon: "🕹️" },
  { id: "snake_pro", title: "Snake Wrangler", description: "Score 100+ points in Snake Classic", icon: "🐍" },
  { id: "pong_champion", title: "Paddle Wizard", description: "Win 5 matches in Pong Battle", icon: "🏓" },
  { id: "breakout_master", title: "Wall Breaker", description: "Reach a 5x combo multiplier in Breakout", icon: "🧱" },
  { id: "2048_genius", title: "Tile Architect", description: "Reach the 2048 tile", icon: "🔢" },
  { id: "minesweeper_hero", title: "Mine Sweeper", description: "Clear a Minesweeper field without detonating", icon: "💣" },
  { id: "memory_master", title: "Photographic Memory", description: "Complete Memory Match in under 15 moves", icon: "🧠" },
  { id: "typing_demon", title: "Speed Demon", description: "Achieve 75+ WPM in Typing Race", icon: "⌨️" },
  { id: "trivia_master", title: "Brainiac", description: "Score 100+ points in Trivia Battle", icon: "❓" },
  { id: "mole_whacker", title: "Mole Buster", description: "Reach a 10x streak in Whack-a-Mole", icon: "🔨" },
];

const RECENTLY_PLAYED_KEY = "lanky_recently_played_games";
const FAVORITES_KEY = "lanky_favorite_games";
const UNLOCKED_ACHIEVEMENTS_KEY = "lanky_unlocked_achievements";

export function getRecentlyPlayed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(RECENTLY_PLAYED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyPlayed(gameId: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = getRecentlyPlayed();
    const filtered = prev.filter((id) => id !== gameId);
    const updated = [gameId, ...filtered].slice(0, 6);
    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
  } catch {}
}

export function getFavoriteGames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteGame(gameId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const favorites = getFavoriteGames();
    const isFav = favorites.includes(gameId);
    let updated: string[];
    if (isFav) {
      updated = favorites.filter((id) => id !== gameId);
    } else {
      updated = [...favorites, gameId];
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return !isFav;
  } catch {
    return false;
  }
}

export function getUnlockedAchievements(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function unlockAchievement(achievementId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const unlocked = getUnlockedAchievements();
    if (!unlocked[achievementId]) {
      unlocked[achievementId] = new Date().toISOString();
      localStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
      return true;
    }
  } catch {}
  return false;
}
