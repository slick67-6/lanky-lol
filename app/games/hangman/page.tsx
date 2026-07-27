"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState } from "react";

const WORD_BANK = [
  "NEXTJS", "CYBERSPACE", "ALGORITHM", "DEVELOPER", "FRONTEND",
  "TYPESCRIPT", "FULLSTACK", "DATABASE", "GRAPHQL", "INTERFACE",
  "GLASSMORPHISM", "LIGHTNING", "PERFORMANCE", "STYLING", "FRAMEWORK"
];

const MAX_ERRORS = 6;

export default function HangmanGamePage() {
  const [word, setWord] = useState(() => WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [streak, setStreak] = useState(0);

  const { highScore, updateHighScore } = useHighScore("hangman", 0);

  const errorsCount = guessedLetters.filter((letter) => !word.includes(letter)).length;
  const isWon = word.split("").every((l) => guessedLetters.includes(l));
  const isLost = errorsCount >= MAX_ERRORS;

  const handleGuess = (letter: string) => {
    if (!isPlaying || guessedLetters.includes(letter) || isWon || isLost) return;

    soundManager.playPop();
    const nextGuessed = [...guessedLetters, letter];
    setGuessedLetters(nextGuessed);

    if (word.includes(letter)) {
      soundManager.playSuccess();
      if (word.split("").every((l) => nextGuessed.includes(l))) {
        setIsPlaying(false);
        soundManager.playWin();
        setStreak((s) => {
          const next = s + 1;
          updateHighScore(next);
          return next;
        });
      }
    } else {
      soundManager.playHit();
      if (errorsCount + 1 >= MAX_ERRORS) {
        setIsPlaying(false);
        soundManager.playGameOver();
        setStreak(0);
      }
    }
  };

  const startNewWord = () => {
    const nextWord = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    setWord(nextWord);
    setGuessedLetters([]);
    setIsPlaying(true);
  };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <GameShell
      title="Hangman Word Challenge"
      description="Guess the hidden tech & web developer word before your guesses run out!"
      icon="📝"
      score={streak}
      highScore={highScore}
      scoreLabel="Streak"
      highScoreLabel="Best Streak"
      isPlaying={isPlaying}
      howToPlayText="Guess letters of the hidden word. You have 6 allowed wrong guesses. Build streaks by solving consecutive words!"
    >
      <div className="flex flex-col items-center max-w-xl mx-auto">
        <div className="mb-6 flex items-center justify-between w-full max-w-md px-4 text-sm font-semibold">
          <span className="text-rose-400">Errors: {errorsCount} / {MAX_ERRORS}</span>
          <span className="text-amber-400">🔥 Streak: {streak}x</span>
        </div>

        {/* Hidden Word Display */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {word.split("").map((letter, idx) => {
            const revealed = guessedLetters.includes(letter) || isLost;
            return (
              <div
                key={idx}
                className={`flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border-2 font-mono text-xl sm:text-2xl font-black ${
                  revealed
                    ? isLost && !guessedLetters.includes(letter)
                      ? "border-rose-500 bg-rose-950/60 text-rose-300"
                      : "border-cyan-400 bg-cyan-950/60 text-cyan-200"
                    : "border-slate-700 bg-slate-900/60 text-transparent"
                }`}
              >
                {revealed ? letter : "_"}
              </div>
            );
          })}
        </div>

        {/* Keyboard Letter Buttons */}
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 w-full max-w-md">
          {alphabet.map((letter) => {
            const used = guessedLetters.includes(letter);
            const isCorrect = used && word.includes(letter);

            return (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={!isPlaying || used || isWon || isLost}
                className={`h-10 rounded-xl border font-bold text-sm transition-all ${
                  used
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 opacity-60"
                      : "border-rose-500/50 bg-rose-950/40 text-rose-400 opacity-40"
                    : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-cyan-400 hover:bg-slate-800"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {(isWon || isLost) && (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 text-center">
            <p className="text-xl font-bold text-cyan-300">
              {isWon ? "🎉 Word Solved!" : `💥 Word was: ${word}`}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startNewWord}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {isWon || isLost ? "Next Word →" : "New Word"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
