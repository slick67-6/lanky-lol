"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useRef } from "react";

type WordMode = 15 | 25 | 50 | 100 | "infinite";

const DICTIONARY = [
  "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "code", "react",
  "nextjs", "typescript", "cyber", "function", "variable", "async", "await", "import",
  "export", "default", "component", "state", "effect", "render", "hook", "layout",
  "style", "theme", "design", "shadow", "border", "padding", "margin", "vector",
  "canvas", "audio", "sound", "keyboard", "window", "document", "element", "event",
  "handler", "promise", "string", "number", "boolean", "object", "array", "symbol"
];

function generateWordList(count: number | "infinite", withPunctuation: boolean, withNumbers: boolean): string {
  const numWords = count === "infinite" ? 40 : count;
  const list: string[] = [];

  for (let i = 0; i < numWords; i++) {
    let word = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
    if (withNumbers && Math.random() < 0.2) {
      word = Math.floor(Math.random() * 999).toString();
    }
    if (withPunctuation && Math.random() < 0.25) {
      const punc = [",", ".", "!", "?", ";"][Math.floor(Math.random() * 5)];
      word += punc;
    }
    list.push(word);
  }

  return list.join(" ");
}

export default function TypingRaceGamePage() {
  const [wordMode, setWordMode] = useState<WordMode>(25);
  const [withPunctuation, setWithPunctuation] = useState(false);
  const [withNumbers, setWithNumbers] = useState(false);

  const [targetText, setTargetText] = useState<string>(() =>
    generateWordList(25, false, false)
  );
  const [userInput, setUserInput] = useState("");
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);

  const { highScore: bestWpm, updateHighScore: updateBestWpm } = useHighScore("typing_race_wpm", 0);

  const resetRace = (mode: WordMode = wordMode, punc = withPunctuation, num = withNumbers) => {
    const text = generateWordList(mode, punc, num);
    setTargetText(text);
    setUserInput("");
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setGameOver(false);
    setIsPlaying(false);
    startTimeRef.current = null;
  };

  const startRace = (e?: React.MouseEvent) => {
    resetRace();
    setIsPlaying(true);
    if (e) startTimeRef.current = e.timeStamp;
    soundManager.playBlip();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (gameOver) return;

    if (!isPlaying || startTimeRef.current === null) {
      setIsPlaying(true);
      startTimeRef.current = e.timeStamp;
    }

    setUserInput(val);
    soundManager.playPop();

    const elapsedSeconds = Math.max(0.5, (e.timeStamp - (startTimeRef.current || e.timeStamp)) / 1000);
    const correctChars = val.split("").filter((char, idx) => char === targetText[idx]).length;

    const currentCpm = Math.round((correctChars / elapsedSeconds) * 60);
    const currentWpm = Math.round((correctChars / 5 / elapsedSeconds) * 60);
    const currentAcc = Math.round((correctChars / Math.max(1, val.length)) * 100);

    setCpm(currentCpm);
    setWpm(currentWpm);
    setAccuracy(currentAcc);

    if (val.length >= targetText.length) {
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playWin();
      updateBestWpm(currentWpm);
    }
  };

  return (
    <GameShell
      title="Typing Race (Monkeytype)"
      description="Monkeytype-style raw typing test! Immediate finish, word counts, and accuracy statistics."
      icon="⌨️"
      score={wpm}
      highScore={bestWpm}
      scoreLabel="WPM"
      highScoreLabel="Best WPM"
      isPlaying={isPlaying}
      howToPlayText="Type the words as fast and accurately as possible. The test finishes immediately upon typing the final character."
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
            {([15, 25, 50, 100, "infinite"] as WordMode[]).map((mode) => (
              <button
                key={String(mode)}
                onClick={() => {
                  setWordMode(mode);
                  resetRace(mode, withPunctuation, withNumbers);
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase ${
                  wordMode === mode ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const next = !withPunctuation;
              setWithPunctuation(next);
              resetRace(wordMode, next, withNumbers);
            }}
            className={`rounded-xl border px-3 py-1 text-xs font-semibold ${
              withPunctuation ? "border-cyan-400 bg-cyan-950 text-cyan-200" : "border-slate-700 text-slate-400"
            }`}
          >
            ! Punctuation
          </button>

          <button
            onClick={() => {
              const next = !withNumbers;
              setWithNumbers(next);
              resetRace(wordMode, withPunctuation, next);
            }}
            className={`rounded-xl border px-3 py-1 text-xs font-semibold ${
              withNumbers ? "border-cyan-400 bg-cyan-950 text-cyan-200" : "border-slate-700 text-slate-400"
            }`}
          >
            # Numbers
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <div className="mb-6 flex justify-around w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-3 text-center">
          <div>
            <p className="text-xs text-slate-400">WPM</p>
            <p className="text-xl font-bold text-cyan-300">{wpm}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">CPM</p>
            <p className="text-xl font-bold text-cyan-300">{cpm}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Accuracy</p>
            <p className="text-xl font-bold text-cyan-300">{accuracy}%</p>
          </div>
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          className="mb-6 w-full max-h-56 overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-6 shadow-2xl text-left font-mono leading-relaxed text-lg sm:text-xl cursor-text"
        >
          {targetText.split("").map((char, index) => {
            let color = "text-slate-500";
            if (index < userInput.length) {
              color = userInput[index] === char ? "text-cyan-200 font-bold" : "text-rose-400 font-bold bg-rose-950/60";
            }
            const isCursor = index === userInput.length;
            return (
              <span key={index} className={`${color} ${isCursor ? "border-l-2 border-cyan-400 animate-pulse bg-cyan-500/20" : ""}`}>
                {char}
              </span>
            );
          })}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInputChange}
          disabled={gameOver}
          placeholder={isPlaying ? "Type words here..." : "Start typing or click Start Race below..."}
          className="w-full rounded-2xl border-2 border-slate-700/80 bg-slate-900/60 px-4 py-3.5 font-mono text-base text-cyan-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
        />

        {gameOver && (
          <div className="mt-6 w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
            <p className="text-xl font-bold text-emerald-300">🎉 Race Complete!</p>
            <p className="text-sm text-slate-300">Speed: <strong>{wpm} WPM</strong> ({cpm} CPM) | Accuracy: <strong>{accuracy}%</strong></p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startRace}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Race Again" : "Start Race"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
