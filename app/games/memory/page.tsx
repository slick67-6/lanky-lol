"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect } from "react";

const EMOJIS = ["🎮", "🎲", "🎯", "🎪", "🎨", "🎭", "🎪", "🎨", "🎮", "🎲", "🎯", "🎭"];

export default function MemoryGamePage() {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffled = [...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        flipped: false,
        matched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const handleCardClick = (index: number) => {
    if (!isPlaying || gameOver) return;
    if (flippedCards.length === 2) return;
    if (cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      const [first, second] = newFlipped;

      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const updatedCards = [...newCards];
          updatedCards[first].matched = true;
          updatedCards[second].matched = true;
          setCards(updatedCards);
          setFlippedCards([]);

          if (updatedCards.every((card) => card.matched)) {
            setGameOver(true);
            setIsPlaying(false);
          }
        }, 500);
      } else {
        setTimeout(() => {
          const updatedCards = [...newCards];
          updatedCards[first].flipped = false;
          updatedCards[second].flipped = false;
          setCards(updatedCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Memory Match" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🧠 Memory Match
            </h1>
            <p className="mb-8 text-slate-400">
              Flip cards and match pairs. Test your memory skills!
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Moves</p>
                <p className="text-2xl font-bold text-cyan-100">{moves}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-2xl font-bold text-cyan-100">
                  {gameOver ? "Won!" : isPlaying ? "Playing" : "Ready"}
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-3">
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(index)}
                  disabled={!isPlaying || gameOver}
                  className={`aspect-square rounded-xl border-2 text-4xl transition-all ${
                    card.flipped || card.matched
                      ? "border-cyan-500/50 bg-cyan-950/50"
                      : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/30"
                  } ${!isPlaying && !card.matched ? "opacity-50" : ""}`}
                >
                  {card.flipped || card.matched ? card.emoji : "?"}
                </button>
              ))}
            </div>

            {gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">🎉 You Won!</p>
                <p className="text-slate-400">Completed in {moves} moves</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={initializeGame}
                className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
              >
                {gameOver ? "Play Again" : "Restart"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
