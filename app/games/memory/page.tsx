"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useCallback } from "react";

type Difficulty = "easy" | "medium" | "hard";

const EMOJI_POOL = [
  "🎮", "🎲", "🎯", "🎪", "🎨", "🎭", "🚀", "🪐", "💎", "🔮", "⚡", "🔥",
  "👾", "🤖", "🏆", "🍕", "🍔", "🍦", "🦄", "🐉", "🐱", "🐶", "🦊", "🐼"
];

function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPairsCount(diff: Difficulty) {
  return diff === "easy" ? 6 : diff === "medium" ? 8 : 12;
}

function createInitialCards(diff: Difficulty) {
  const pairsCount = getPairsCount(diff);
  const selectedEmojis = EMOJI_POOL.slice(0, pairsCount);
  const doubled = [...selectedEmojis, ...selectedEmojis];
  return fisherYatesShuffle(doubled).map((emoji, index) => ({
    id: index,
    emoji,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryGamePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState(() => createInitialCards("easy"));
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const { highScore: bestMoves, updateHighScore: updateBestMoves } = useHighScore(`memory_${difficulty}`, 999);

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    setCards(createInitialCards(diff));
    setFlippedCards([]);
    setIsProcessing(false);
    setMoves(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const restartGame = useCallback(() => {
    setCards(createInitialCards(difficulty));
    setFlippedCards([]);
    setIsProcessing(false);
    setMoves(0);
    setGameOver(false);
    setIsPlaying(true);
  }, [difficulty]);

  const handleCardClick = (index: number) => {
    if (!isPlaying || gameOver || isProcessing) return;
    if (cards[index].flipped || cards[index].matched) return;

    soundManager.playPop();

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      setMoves((prev) => prev + 1);
      const [first, second] = newFlipped;

      if (newCards[first].emoji === newCards[second].emoji) {
        soundManager.playSuccess();
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[first].matched = true;
            updated[second].matched = true;

            if (updated.every((card) => card.matched)) {
              setGameOver(true);
              setIsPlaying(false);
              soundManager.playWin();
              updateBestMoves(moves + 1);
            }
            return updated;
          });
          setFlippedCards([]);
          setIsProcessing(false);
        }, 400);
      } else {
        setTimeout(() => {
          soundManager.playHit();
          setCards((prev) => {
            const updated = [...prev];
            updated[first].flipped = false;
            updated[second].flipped = false;
            return updated;
          });
          setFlippedCards([]);
          setIsProcessing(false);
        }, 900);
      }
    }
  };

  return (
    <GameShell
      title="Memory Match"
      description="Flip cards, match identical pairs, and sharpen your memory!"
      icon="🧠"
      score={moves}
      highScore={bestMoves === 999 ? 0 : bestMoves}
      scoreLabel="Moves"
      highScoreLabel="Best Moves"
      isPlaying={isPlaying}
      howToPlayText="Click any card to flip it over. Match pairs of identical emojis in as few moves as possible."
      customControls={
        <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                difficulty === d ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              {d} ({getPairsCount(d) * 2})
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div
          className={`grid gap-3 ${
            difficulty === "easy"
              ? "grid-cols-3 sm:grid-cols-4 max-w-sm"
              : difficulty === "medium"
              ? "grid-cols-4 max-w-md"
              : "grid-cols-4 sm:grid-cols-6 max-w-xl"
          }`}
        >
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={!isPlaying || isProcessing || card.flipped || card.matched}
              aria-label={`Card ${index + 1}`}
              className={`aspect-square h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 text-3xl sm:text-4xl transition-all duration-300 flex items-center justify-center ${
                card.flipped || card.matched
                  ? "border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-105"
                  : "border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900"
              }`}
            >
              {card.flipped || card.matched ? card.emoji : "❓"}
            </button>
          ))}
        </div>

        {gameOver && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
            <p className="text-xl font-bold text-emerald-400">🎉 Memory Mastered!</p>
            <p className="text-sm text-slate-300">Completed in {moves} moves</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={restartGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Play Again" : "Restart Match"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
