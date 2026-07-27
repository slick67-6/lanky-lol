"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useRef } from "react";

type TextCategory = "quotes" | "tech" | "code";

const TEXT_DATA: Record<TextCategory, string[]> = {
  quotes: [
    "The quick brown fox jumps over the lazy dog. Persistence and practice make perfection in every craft.",
    "A journey of a thousand miles begins with a single step. Focus on consistency over raw speed.",
    "Reading expands your mind. Every book adds a new perspective and vocabulary to your thoughts.",
  ],
  tech: [
    "In computer science, artificial intelligence is intelligence demonstrated by software algorithms and machines.",
    "The internet connects billions of devices worldwide through scalable protocol suites and server infrastructure.",
    "Programming is the art of telling a computer what tasks to solve using precise mathematical logic.",
  ],
  code: [
    "const result = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: text }) });",
    "function calculateWpm(chars: number, timeSec: number) { return Math.round((chars / 5) / (timeSec / 60)); }",
    "export default function App() { const [score, setScore] = useState(0); return <main>{score}</main>; }",
  ],
};

function getRandomText(cat: TextCategory): string {
  const list = TEXT_DATA[cat];
  return list[Math.floor(Math.random() * list.length)];
}

export default function TypingRaceGamePage() {
  const [category, setCategory] = useState<TextCategory>("quotes");
  const [targetText, setTargetText] = useState<string>(() => getRandomText("quotes"));
  const [userInput, setUserInput] = useState("");
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { highScore: bestWpm, updateHighScore: updateBestWpm } = useHighScore("typing_race_wpm", 0);

  const handleCategorySelect = (cat: TextCategory) => {
    setCategory(cat);
    const text = getRandomText(cat);
    setTargetText(text);
    setUserInput("");
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setTimeLeft(60);
    setGameOver(false);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startGame = () => {
    const text = getRandomText(category);
    setTargetText(text);
    setUserInput("");
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setTimeLeft(60);
    setGameOver(false);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    soundManager.playBlip();

    setTimeout(() => inputRef.current?.focus(), 100);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          setIsPlaying(false);
          soundManager.playWin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlaying || gameOver) return;
    const val = e.target.value;
    setUserInput(val);

    soundManager.playPop();

    const elapsedSeconds = Math.max(1, (Date.now() - (startTimeRef.current || Date.now())) / 1000);

    // CPM & WPM calculation (standard 5 chars = 1 word)
    const correctChars = val.split("").filter((char, idx) => char === targetText[idx]).length;
    const currentCpm = Math.round((correctChars / elapsedSeconds) * 60);
    const currentWpm = Math.round((correctChars / 5 / elapsedSeconds) * 60);
    const currentAcc = Math.round((correctChars / Math.max(1, val.length)) * 100);

    setCpm(currentCpm);
    setWpm(currentWpm);
    setAccuracy(currentAcc);

    if (val === targetText) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playWin();
      updateBestWpm(currentWpm);
    }
  };

  return (
    <GameShell
      title="Typing Race"
      description="Test your typing speed (WPM & CPM), precision accuracy, and master quote/code snippets!"
      icon="⌨️"
      score={wpm}
      highScore={bestWpm}
      scoreLabel="WPM"
      highScoreLabel="Best WPM"
      isPlaying={isPlaying}
      howToPlayText="Type the displayed sentence as fast and accurately as possible within 60 seconds. Correct characters glow green; incorrect ones turn red."
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">Snippet:</span>
          {(["quotes", "tech", "code"] as TextCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                category === cat
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <div className="mb-6 flex justify-around w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-3 text-center">
          <div>
            <p className="text-xs text-slate-400">CPM</p>
            <p className="text-xl font-bold text-cyan-300">{cpm}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Accuracy</p>
            <p className="text-xl font-bold text-cyan-300">{accuracy}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Time Left</p>
            <p className="text-xl font-bold text-cyan-300">{timeLeft}s</p>
          </div>
        </div>

        {/* Text Display Container */}
        <div className="mb-6 w-full rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-6 shadow-2xl text-left font-mono leading-relaxed text-base sm:text-lg">
          {targetText.split("").map((char, index) => {
            let color = "text-slate-500";
            if (index < userInput.length) {
              color = userInput[index] === char ? "text-emerald-400 font-bold bg-emerald-950/40" : "text-rose-400 font-bold bg-rose-950/60";
            }
            const isCursor = index === userInput.length;
            return (
              <span key={index} className={`${color} ${isCursor ? "border-b-2 border-cyan-400 animate-pulse" : ""}`}>
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
          disabled={!isPlaying || gameOver}
          placeholder={isPlaying ? "Type here..." : "Click Start Race below"}
          className="w-full rounded-2xl border-2 border-slate-700/80 bg-slate-900/60 px-4 py-3.5 font-mono text-base text-cyan-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
        />

        {gameOver && (
          <div className="mt-6 w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
            <p className="text-xl font-bold text-emerald-300">🎉 Race Complete!</p>
            <p className="text-sm text-slate-300">Speed: {wpm} WPM ({cpm} CPM) | Accuracy: {accuracy}%</p>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <button
            onClick={startGame}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Race Again" : "Start Race"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
