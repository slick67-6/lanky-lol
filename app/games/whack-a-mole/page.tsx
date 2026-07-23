"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useState, useEffect } from "react";

export default function WhackAMoleGamePage() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMole, setActiveMole] = useState<number | null>(null);

  const holes = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  useEffect(() => {
    let moleInterval: number;
    let timerInterval: number;

    if (isPlaying && timeLeft > 0) {
      moleInterval = window.setInterval(() => {
        const randomHole = Math.floor(Math.random() * holes.length);
        setActiveMole(randomHole);
        setTimeout(() => setActiveMole(null), 800);
      }, 1000);

      timerInterval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    if (timeLeft === 0) {
      setIsPlaying(false);
      setActiveMole(null);
    }

    return () => {
      clearInterval(moleInterval);
      clearInterval(timerInterval);
    };
  }, [isPlaying, timeLeft]);

  const handleWhack = (index: number) => {
    if (!isPlaying || activeMole !== index) return;
    setScore((prev) => prev + 10);
    setActiveMole(null);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setActiveMole(null);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Whack-a-Mole" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-lg text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              🔨 Whack-a-Mole
            </h1>
            <p className="mb-8 text-slate-400">
              Quick reflexes needed! Whack the moles as they pop up.
            </p>

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-2xl font-bold text-cyan-100">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Time</p>
                <p className="text-2xl font-bold text-cyan-100">{timeLeft}s</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4 max-w-[400px] mx-auto">
              {holes.map((index) => (
                <button
                  key={index}
                  onClick={() => handleWhack(index)}
                  disabled={!isPlaying}
                  className={`aspect-square rounded-full border-2 text-4xl transition-all ${
                    activeMole === index
                      ? "border-cyan-500 bg-cyan-950/50 scale-110"
                      : "border-slate-700 bg-slate-900/50"
                  } ${!isPlaying ? "opacity-50" : ""}`}
                >
                  {activeMole === index ? "🐹" : "🕳️"}
                </button>
              ))}
            </div>

            {!isPlaying && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                {timeLeft === 30 ? (
                  <>
                    <p className="text-lg font-semibold text-cyan-400">Ready to Play!</p>
                    <p className="text-slate-400">Click Start to begin</p>
                  </>
                ) : timeLeft === 0 ? (
                  <>
                    <p className="text-lg font-semibold text-cyan-400">Time's Up!</p>
                    <p className="text-slate-400">Final Score: {score}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-cyan-400">Game Stopped</p>
                    <p className="text-slate-400">Score: {score} | Time left: {timeLeft}s</p>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  {timeLeft === 30 ? "Start Game" : timeLeft === 0 ? "Play Again" : "Resume"}
                </button>
              ) : (
                <button
                  onClick={() => setIsPlaying(false)}
                  className="rounded-xl bg-rose-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  Stop Game
                </button>
              )}
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Click on the moles when they appear. You have 30 seconds to get the highest score!</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
