"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { OnlineMatchmakingPanel } from "@/components/online-matchmaking-panel";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";

const QUESTIONS = [
  {
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correct: 2,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1,
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correct: 3,
  },
  {
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correct: 1,
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correct: 2,
  },
  {
    question: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correct: 2,
  },
  {
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    correct: 1,
  },
  {
    question: "Which element has the atomic number 1?",
    options: ["Helium", "Oxygen", "Carbon", "Hydrogen"],
    correct: 3,
  },
  {
    question: "What is the currency of Japan?",
    options: ["Yuan", "Won", "Yen", "Ringgit"],
    correct: 2,
  },
  {
    question: "How many continents are there on Earth?",
    options: ["5", "6", "7", "8"],
    correct: 2,
  },
];

export default function TriviaGamePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const handleAnswer = (index: number) => {
    if (showAnswer || !isPlaying) return;

    setSelectedAnswer(index);
    setShowAnswer(true);

    if (index === QUESTIONS[currentQuestion].correct) {
      setScore((prev) => prev + 10);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
    } else {
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  const startGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Trivia Battle" />
        <GamesBackLink />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
              ❓ Trivia Battle
            </h1>
            <p className="mb-8 text-slate-400">
              Answer questions faster than your opponents. Test your knowledge!
            </p>

            <OnlineMatchmakingPanel gameName="Trivia Battle" />

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-2xl font-bold text-cyan-100">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Question</p>
                <p className="text-2xl font-bold text-cyan-100">
                  {currentQuestion + 1} / {QUESTIONS.length}
                </p>
              </div>
            </div>

            {isPlaying && !gameOver && (
              <div className="mb-6 rounded-xl border-2 border-cyan-500/30 bg-slate-950/50 p-6">
                <h2 className="mb-6 text-xl font-semibold text-cyan-100">
                  {QUESTIONS[currentQuestion].question}
                </h2>
                <div className="grid gap-3">
                  {QUESTIONS[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={showAnswer}
                      className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                        showAnswer
                          ? index === QUESTIONS[currentQuestion].correct
                            ? "border-green-500/50 bg-green-950/30 text-green-400"
                            : selectedAnswer === index
                            ? "border-red-500/50 bg-red-950/30 text-red-400"
                            : "border-slate-700 bg-slate-900/50 text-slate-400 opacity-50"
                          : "border-slate-700 bg-slate-900/50 text-cyan-100 hover:border-cyan-500/50 hover:bg-cyan-950/30"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {showAnswer && (
                  <button
                    onClick={nextQuestion}
                    className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                  >
                    {currentQuestion < QUESTIONS.length - 1 ? "Next Question" : "See Results"}
                  </button>
                )}
              </div>
            )}

            {gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6">
                <p className="text-lg font-semibold text-cyan-400">Quiz Complete!</p>
                <p className="text-slate-400">Final Score: {score} / {QUESTIONS.length * 10}</p>
                <p className="text-slate-400">
                  You got {score / 10} out of {QUESTIONS.length} questions correct!
                </p>
              </div>
            )}

            {!isPlaying && !gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">Ready to Test Your Knowledge?</p>
                <p className="text-slate-400">10 questions covering various topics</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {!isPlaying ? (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  {gameOver ? "Play Again" : "Start Quiz"}
                </button>
              ) : (
                <button
                  onClick={() => setIsPlaying(false)}
                  className="rounded-xl bg-rose-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  Stop Quiz
                </button>
              )}
            </div>

            <div className="mt-8 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How to Play:</p>
              <p>Answer each question correctly to earn points. Green indicates correct, red indicates wrong.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
