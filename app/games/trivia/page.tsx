"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { GamesBackLink } from "@/components/games-back-link";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";

const QUESTIONS = [
  { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "Who wrote 'Romeo and Juliet'?", options: ["Dickens", "Shakespeare", "Austen", "Twain"], correct: 1 },
  { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
  { question: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"], correct: 1 },
  { question: "Which element has the atomic number 1?", options: ["Helium", "Oxygen", "Carbon", "Hydrogen"], correct: 3 },
  { question: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], correct: 2 },
  { question: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correct: 2 },
  { question: "What is the hardest natural substance on Earth?", options: ["Quartz", "Topaz", "Diamond", "Sapphire"], correct: 2 },
  { question: "Which country has the most people?", options: ["USA", "India", "China", "Indonesia"], correct: 1 },
  { question: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correct: 2 },
  { question: "What does CPU stand for?", options: ["Core Processing Unit", "Central Processing Unit", "Computer Personal Unit", "Central Program Utility"], correct: 1 },
  { question: "Which language has the most native speakers?", options: ["English", "Spanish", "Hindi", "Mandarin Chinese"], correct: 3 },
  { question: "What is the speed of light in km/s (approx)?", options: ["150,000", "200,000", "300,000", "400,000"], correct: 2 },
  { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Donatello", "Leonardo da Vinci"], correct: 3 },
  { question: "What is the tallest mountain?", options: ["K2", "Everest", "Kilimanjaro", "Denali"], correct: 1 },
  { question: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "CO2", "Argon"], correct: 1 },
  { question: "What is the square root of 144?", options: ["10", "11", "12", "14"], correct: 2 },
  { question: "Who discovered penicillin?", options: ["Pasteur", "Fleming", "Curie", "Koch"], correct: 1 },
  { question: "What is the largest desert on Earth?", options: ["Sahara", "Arabian", "Gobi", "Antarctic"], correct: 3 },
  { question: "How many bones are in the adult human body?", options: ["186", "196", "206", "216"], correct: 2 },
  { question: "What does HTTP stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "HyperText Transit Process", "Host Text Transfer Protocol"], correct: 0 },
  { question: "What is the chemical symbol for water?", options: ["Wa", "H2O", "OH2", "Hy"], correct: 1 },
  { question: "Which country gifted the Statue of Liberty to the USA?", options: ["UK", "Germany", "France", "Italy"], correct: 2 },
  { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi"], correct: 2 },
  { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correct: 2 },
  { question: "In which sport is the term 'love' used?", options: ["Cricket", "Tennis", "Golf", "Basketball"], correct: 1 },
  { question: "What is the boiling point of water in Celsius?", options: ["90", "95", "100", "110"], correct: 2 },
  { question: "Who was the first person on the moon?", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], correct: 2 },
  { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Onion", "Pepper"], correct: 1 },
  { question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correct: 2 },
  { question: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], correct: 3 },
  { question: "Which animal is known as the 'King of the Jungle'?", options: ["Tiger", "Lion", "Elephant", "Gorilla"], correct: 1 },
  { question: "What year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correct: 2 },
  { question: "What does DNA stand for?", options: ["Deoxyribonucleic Acid", "Dinitrogen Acid", "Double Nucleic Acid", "Deoxyribose Nucleic Acid"], correct: 0 },
  { question: "What is the largest country by area?", options: ["Canada", "China", "USA", "Russia"], correct: 3 },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1 },
  { question: "What is the chemical formula for table salt?", options: ["KCl", "CaCl2", "NaCl", "MgO"], correct: 2 },
  { question: "Who is known as the father of computers?", options: ["Alan Turing", "Charles Babbage", "Ada Lovelace", "Steve Jobs"], correct: 1 },
  { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: 1 },
  { question: "What type of animal is a dolphin?", options: ["Fish", "Reptile", "Mammal", "Amphibian"], correct: 2 },
  { question: "What is the freezing point of water in Fahrenheit?", options: ["0", "24", "32", "40"], correct: 2 },
  { question: "What is JavaScript primarily used for?", options: ["Database", "Web pages", "OS", "Printing"], correct: 1 },
  { question: "Who developed the theory of relativity?", options: ["Newton", "Einstein", "Hawking", "Tesla"], correct: 1 },
  { question: "What is the most abundant element in the universe?", options: ["Oxygen", "Carbon", "Hydrogen", "Helium"], correct: 2 },
  { question: "What does GUI stand for?", options: ["Graphical User Interface", "General User Input", "Graphics Unified Interface", "Global User Interaction"], correct: 0 },
  { question: "How many degrees are in a circle?", options: ["180", "270", "360", "400"], correct: 2 },
  { question: "What is the national animal of Australia?", options: ["Koala", "Kangaroo", "Wombat", "Platypus"], correct: 1 },
];

export default function TriviaGamePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundQuestions, setRoundQuestions] = useState(QUESTIONS);

  const shufflePicks = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  };

  const handleAnswer = (index: number) => {
    if (showAnswer || !isPlaying) return;

    setSelectedAnswer(index);
    setShowAnswer(true);

    if (index === roundQuestions[currentQuestion].correct) {
      setScore((prev) => prev + 10);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < roundQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
    } else {
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  const startGame = () => {
    setRoundQuestions(shufflePicks());
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

            <div className="mb-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-2xl font-bold text-cyan-100">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">Question</p>
                <p className="text-2xl font-bold text-cyan-100">
                  {currentQuestion + 1} / {roundQuestions.length}
                </p>
              </div>
            </div>

            {isPlaying && !gameOver && (
              <div className="mb-6 rounded-xl border-2 border-cyan-500/30 bg-slate-950/50 p-6">
                <h2 className="mb-6 text-xl font-semibold text-cyan-100">
                  {roundQuestions[currentQuestion].question}
                </h2>
                <div className="grid gap-3">
                  {roundQuestions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={showAnswer}
                      className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                        showAnswer
                          ? index === roundQuestions[currentQuestion].correct
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
                    {currentQuestion < roundQuestions.length - 1 ? "Next Question" : "See Results"}
                  </button>
                )}
              </div>
            )}

            {gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6">
                <p className="text-lg font-semibold text-cyan-400">Quiz Complete!</p>
                <p className="text-slate-400">Final Score: {score} / {roundQuestions.length * 10}</p>
                <p className="text-slate-400">
                  You got {score / 10} out of {roundQuestions.length} questions correct!
                </p>
              </div>
            )}

            {!isPlaying && !gameOver && (
              <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <p className="text-lg font-semibold text-cyan-400">Ready to Test Your Knowledge?</p>
                <p className="text-slate-400">10 random questions from {QUESTIONS.length} covering various topics</p>
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
