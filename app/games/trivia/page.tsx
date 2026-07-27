"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useEffect, useCallback, useRef } from "react";

type Category = "all" | "tech" | "science" | "history";

interface Question {
  question: string;
  category: Category;
  options: string[];
  correct: number;
}

const RAW_QUESTIONS: Question[] = [
  { question: "What is the capital of France?", category: "history", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
  { question: "Which planet is known as the Red Planet?", category: "science", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
  { question: "What is the chemical symbol for gold?", category: "science", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { question: "What does CPU stand for?", category: "tech", options: ["Core Processing Unit", "Central Processing Unit", "Computer Personal Unit", "Central Program Utility"], correct: 1 },
  { question: "In which year did World War II end?", category: "history", options: ["1943", "1944", "1945", "1946"], correct: 2 },
  { question: "What is the largest mammal in the world?", category: "science", options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"], correct: 1 },
  { question: "Which element has the atomic number 1?", category: "science", options: ["Helium", "Oxygen", "Carbon", "Hydrogen"], correct: 3 },
  { question: "What does HTTP stand for?", category: "tech", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "HyperText Transit Process", "Host Text Transfer Protocol"], correct: 0 },
  { question: "Who painted the Mona Lisa?", category: "history", options: ["Michelangelo", "Raphael", "Donatello", "Leonardo da Vinci"], correct: 3 },
  { question: "What is the speed of light in km/s (approx)?", category: "science", options: ["150,000", "200,000", "300,000", "400,000"], correct: 2 },
  { question: "What is the hardest natural substance on Earth?", category: "science", options: ["Quartz", "Topaz", "Diamond", "Sapphire"], correct: 2 },
  { question: "What year was the first iPhone released?", category: "tech", options: ["2005", "2006", "2007", "2008"], correct: 2 },
  { question: "Who is known as the father of computers?", category: "tech", options: ["Alan Turing", "Charles Babbage", "Ada Lovelace", "Steve Jobs"], correct: 1 },
  { question: "What is JavaScript primarily used for?", category: "tech", options: ["Database", "Web development", "OS kernel", "Printing"], correct: 1 },
  { question: "Who developed the theory of relativity?", category: "science", options: ["Newton", "Einstein", "Hawking", "Tesla"], correct: 1 },
];

function shuffleQuestionOptions(q: Question): { question: string; category: Category; options: string[]; correct: number } {
  const optionsWithIndex = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correct }));
  for (let i = optionsWithIndex.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
  }
  const newOptions = optionsWithIndex.map((item) => item.opt);
  const newCorrectIndex = optionsWithIndex.findIndex((item) => item.isCorrect);
  return { ...q, options: newOptions, correct: newCorrectIndex };
}

function generateQuizQuestions(cat: Category): Question[] {
  const filtered = RAW_QUESTIONS.filter((q) => cat === "all" || q.category === cat);
  return [...filtered]
    .sort(() => Math.random() - 0.5)
    .slice(0, 10)
    .map(shuffleQuestionOptions);
}

export default function TriviaGamePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [roundQuestions, setRoundQuestions] = useState<Question[]>(() => generateQuizQuestions("all"));
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef<number | null>(null);
  const { highScore, updateHighScore } = useHighScore("trivia", 0);

  const startQuizForCategory = useCallback((cat: Category) => {
    setSelectedCategory(cat);
    const questions = generateQuizQuestions(cat);
    setRoundQuestions(questions);
    setCurrentQuestionIdx(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(15);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIdx < roundQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
      setTimeLeft(15);
    } else {
      setGameOver(true);
      setIsPlaying(false);
      soundManager.playWin();
    }
  }, [currentQuestionIdx, roundQuestions.length]);

  useEffect(() => {
    if (isPlaying && !showAnswer && !gameOver) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setShowAnswer(true);
            setSelectedAnswer(null);
            setStreak(0);
            soundManager.playHit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, showAnswer, gameOver]);

  const handleAnswer = (optionIdx: number) => {
    if (showAnswer || !isPlaying) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(optionIdx);
    setShowAnswer(true);

    const currentQ = roundQuestions[currentQuestionIdx];
    if (optionIdx === currentQ.correct) {
      soundManager.playSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const timeBonus = timeLeft * 2;
      const streakBonus = nextStreak * 5;
      const points = 10 + timeBonus + streakBonus;

      setScore((s) => {
        const newScore = s + points;
        updateHighScore(newScore);
        return newScore;
      });
    } else {
      soundManager.playHit();
      setStreak(0);
    }
  };

  const currentQ = roundQuestions[currentQuestionIdx];

  return (
    <GameShell
      title="Trivia Battle"
      description="15-second timed rounds, randomized answers, categories, and speed streak bonuses!"
      icon="❓"
      score={score}
      highScore={highScore}
      isPlaying={isPlaying}
      howToPlayText="Answer questions as fast as possible for time bonus points. Consecutive correct answers build up your streak multiplier!"
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">Category:</span>
          {(["all", "tech", "science", "history"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => startQuizForCategory(c)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                selectedCategory === c
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col items-center max-w-xl mx-auto">
        {isPlaying && !gameOver && currentQ && (
          <div className="w-full">
            {/* Header info bar */}
            <div className="mb-4 flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-400">Question {currentQuestionIdx + 1} / {roundQuestions.length}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${timeLeft <= 5 ? "bg-rose-950 text-rose-300 animate-pulse" : "bg-cyan-950 text-cyan-300"}`}>
                ⏱ {timeLeft}s remaining
              </span>
              <span className="text-amber-400">🔥 Streak: {streak}x</span>
            </div>

            {/* Question Box */}
            <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-6 shadow-xl text-center">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-100 leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Options Grid */}
            <div className="grid gap-3">
              {currentQ.options.map((option, idx) => {
                let btnStyle = "border-slate-700/80 bg-slate-900/60 text-cyan-100 hover:border-cyan-500/50 hover:bg-slate-900";
                if (showAnswer) {
                  if (idx === currentQ.correct) {
                    btnStyle = "border-emerald-500 bg-emerald-950/80 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]";
                  } else if (selectedAnswer === idx) {
                    btnStyle = "border-rose-500 bg-rose-950/80 text-rose-300";
                  } else {
                    btnStyle = "border-slate-800 bg-slate-950/40 text-slate-500 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={showAnswer}
                    className={`rounded-2xl border-2 px-5 py-3.5 text-left text-sm sm:text-base font-semibold transition-all duration-200 ${btnStyle}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {showAnswer && (
              <button
                onClick={handleNextQuestion}
                className="mt-6 w-full rounded-2xl bg-cyan-500 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400"
              >
                {currentQuestionIdx < roundQuestions.length - 1 ? "Next Question →" : "See Final Score →"}
              </button>
            )}
          </div>
        )}

        {gameOver && (
          <div className="w-full rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold text-cyan-300 mb-2">🎉 Quiz Completed!</p>
            <p className="text-lg text-slate-300">Final Score: <span className="text-cyan-400 font-bold">{score}</span> points</p>
            <button
              onClick={() => startQuizForCategory(selectedCategory)}
              className="mt-6 rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
