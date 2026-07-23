"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect, useRef } from "react";

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet at least once.",
  "Programming is the art of telling another human what one wants the computer to do. It requires patience, logic, and creativity.",
  "In computer science, artificial intelligence is intelligence demonstrated by machines, as opposed to natural intelligence displayed by humans.",
  "The best way to predict the future is to invent it. Innovation comes from curiosity and the willingness to challenge assumptions.",
  "Technology is best when it brings people together. The most impactful tools connect communities and enable collaboration across borders.",
  "Space exploration has led to countless innovations that benefit life on Earth, from satellite communications to medical imaging technologies.",
  "Learning to code is like learning a new language. It opens doors to understanding how the digital world around us operates.",
  "The internet has transformed how we communicate, learn, and work. It connects billions of people across the globe in real time.",
  "Mathematics is the language of the universe. Every scientific discovery rests on a foundation of mathematical principles and logic.",
  "Reading expands your mind. Every book you finish adds a new perspective, vocabulary, and understanding of the world around you.",
  "A journey of a thousand miles begins with a single step. Consistency and persistence matter more than raw talent or speed.",
  "Great achievements are rarely the work of a single person. Collaboration, teamwork, and shared vision drive meaningful innovation.",
];

export default function TypingRaceGamePage() {
  const [text, setText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)]);
  }, []);

  useEffect(() => {
    let timer: number;
    if (isPlaying && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    if (timeLeft === 0) {
      setGameOver(true);
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      const words = userInput.trim().split(" ").filter((word) => word.length > 0);
      const timeElapsed = 60 - timeLeft;
      if (timeElapsed > 0) {
        setWpm(Math.round((words.length / timeElapsed) * 60));
      }

      const correctChars = userInput.split("").filter((char, index) => char === text[index]).length;
      setAccuracy(Math.round((correctChars / userInput.length) * 100) || 100);

      if (userInput === text) {
        setGameOver(true);
        setIsPlaying(false);
      }
    }
  }, [userInput, isPlaying, gameOver, timeLeft, text]);

  const startGame = () => {
    setUserInput("");
    setWpm(0);
    setAccuracy(100);
    setTimeLeft(60);
    setGameOver(false);
    setIsPlaying(true);
    setText(SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const getCharColor = (index: number) => {
    if (index >= userInput.length) return "text-slate-500";
    if (userInput[index] === text[index]) return "text-green-400";
    return "text-red-400";
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Typing Race" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              ⌨️ Typing Race
            </h1>
            <p className="mb-8 text-slate-400">
              Type as fast as you can! Test your typing speed and accuracy.
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">WPM</p>
                <p className="text-2xl font-bold text-cyan-100">{wpm}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Accuracy</p>
                <p className="text-2xl font-bold text-cyan-100">{accuracy}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Time</p>
                <p className="text-2xl font-bold text-cyan-100">{timeLeft}s</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border-2 border-cyan-500/30 bg-slate-950/50 p-6">
              <p className="mb-4 text-lg leading-relaxed font-mono">
                {text.split("").map((char, index) => (
                  <span key={index} className={getCharColor(index)}>
                    {char}
                  </span>
                ))}
              </p>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                disabled={!isPlaying}
                placeholder="Start typing here..."
                className="w-full rounded-lg border-2 border-slate-700 bg-slate-900/50 px-4 py-3 text-lg font-mono text-cyan-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
              />
            </div>

            {gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">
                  {userInput === text ? "Text Complete!" : "Time's Up!"}
                </p>
                <p className="text-slate-400">WPM: {wpm} | Accuracy: {accuracy}%</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  {gameOver ? "Play Again" : "Start Race"}
                </button>
              ) : (
                <button
                  onClick={() => setIsPlaying(false)}
                  className="rounded-xl bg-rose-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  Stop
                </button>
              )}
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Type the displayed text as quickly and accurately as possible. You have 60 seconds!</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
