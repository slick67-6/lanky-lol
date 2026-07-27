"use client";

import { GameShell } from "@/components/game-shell";
import { soundManager } from "@/lib/audio";
import { useHighScore } from "@/lib/use-high-score";
import { useState, useRef, useEffect } from "react";

type WordMode = 15 | 25 | 50 | 100 | "infinite";

// 200-word dictionary for more variety
const DICTIONARY = [
  "the","quick","brown","fox","jumps","over","lazy","dog","code","react",
  "nextjs","typescript","cyber","function","variable","async","await","import",
  "export","default","component","state","effect","render","hook","layout",
  "style","theme","design","shadow","border","padding","margin","vector",
  "canvas","audio","sound","keyboard","window","document","element","event",
  "handler","promise","string","number","boolean","object","array","symbol",
  "class","extend","return","const","let","type","interface","generic",
  "module","package","build","deploy","server","client","fetch","request",
  "response","header","body","method","token","auth","route","path","query",
  "data","stream","buffer","pipe","transform","compress","encrypt","decode",
  "parse","format","serialize","validate","schema","model","record","field",
  "index","search","filter","reduce","map","sort","group","merge","split",
  "chunk","batch","queue","stack","heap","tree","graph","node","edge","link",
  "store","cache","local","remote","sync","async","flag","config","option",
  "param","value","result","error","debug","trace","log","warn","info",
  "test","mock","stub","spy","expect","assert","check","verify","compare",
  "equal","match","contain","include","exclude","ignore","skip","focus",
  "run","pass","fail","retry","timeout","cancel","abort","reject","resolve",
  "create","update","delete","insert","select","where","order","limit","join",
  "left","right","inner","outer","cross","full","table","column","row","key",
  "primary","foreign","unique","index","view","trigger","procedure","cursor",
  "transaction","commit","rollback","lock","unlock","grant","revoke","policy",
  "screen","display","pixel","frame","layer","mask","clip","rotate","scale",
  "translate","flip","invert","blur","glow","fade","slide","bounce","spring",
  "ease","linear","cubic","quartic","quint","sine","expo","back","elastic",
];

function pickWords(count: number, punc: boolean, nums: boolean): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    let word = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
    if (nums && Math.random() < 0.15) word = String(Math.floor(Math.random() * 999));
    if (punc && Math.random() < 0.22) {
      word += [",", ".", "!", "?", ";"][Math.floor(Math.random() * 5)];
    }
    result.push(word);
  }
  return result;
}

function generateWords(mode: WordMode, punc: boolean, nums: boolean): string[] {
  return pickWords(mode === "infinite" ? 60 : mode, punc, nums);
}

export default function TypingRaceGamePage() {
  const [wordMode, setWordMode] = useState<WordMode>(25);
  const [withPunctuation, setWithPunctuation] = useState(false);
  const [withNumbers, setWithNumbers] = useState(false);

  const [words, setWords] = useState<string[]>(() => generateWords(25, false, false));
  const [currentWord, setCurrentWord] = useState(0);
  const [typed, setTyped] = useState("");
  const [errors, setErrors] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const { highScore: bestWpm, updateHighScore: updateBestWpm } = useHighScore("typing_race_wpm", 0);

  // Scroll current word into view
  useEffect(() => {
    wordRefs.current[currentWord]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentWord]);

  function resetRace(mode: WordMode = wordMode, punc = withPunctuation, num = withNumbers) {
    const newWords = generateWords(mode, punc, num);
    setWords(newWords);
    setCurrentWord(0);
    setTyped("");
    setErrors(0);
    setWpm(0);
    setAccuracy(100);
    setGameOver(false);
    setIsPlaying(false);
    startTimeRef.current = null;
    wordRefs.current = [];
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  function startRace() {
    resetRace();
    soundManager.playBlip();
  }

  function finishRace(finalWpm: number, finalAcc: number) {
    setGameOver(true);
    setIsPlaying(false);
    soundManager.playWin();
    updateBestWpm(finalWpm);
    setWpm(finalWpm);
    setAccuracy(finalAcc);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (gameOver) return;

    // Start timer on first keystroke
    if (!isPlaying) {
      setIsPlaying(true);
      startTimeRef.current = e.timeStamp;
    }

    const elapsed = Math.max(0.5, (e.timeStamp - (startTimeRef.current ?? e.timeStamp)) / 1000);

    // Word completed on space
    if (val.endsWith(" ")) {
      const attempt = val.trimEnd();
      const correct = attempt === words[currentWord];
      if (!correct) setErrors((n) => n + 1);

      const nextWord = currentWord + 1;
      const totalTyped = words.slice(0, nextWord).join(" ").length + 1;
      const correctChars = words.slice(0, nextWord).filter((w, i) => (i < currentWord ? true : correct)).join(" ").length;
      const currentWpm = Math.round((totalTyped / 5 / elapsed) * 60);
      const currentAcc = Math.max(0, Math.round((correctChars / Math.max(1, totalTyped)) * 100));

      if (nextWord >= words.length) {
        // Race done — for infinite mode, add more words
        if (wordMode === "infinite") {
          setWords((prev) => [...prev, ...pickWords(30, withPunctuation, withNumbers)]);
          setCurrentWord(nextWord);
          setTyped("");
          setWpm(currentWpm);
          setAccuracy(currentAcc);
        } else {
          finishRace(currentWpm, currentAcc);
        }
      } else {
        setCurrentWord(nextWord);
        setTyped("");
        setWpm(currentWpm);
        setAccuracy(currentAcc);
        soundManager.playPop();
      }
      return;
    }

    setTyped(val);

    // Partial WPM update
    const allTyped = words.slice(0, currentWord).join(" ") + (currentWord > 0 ? " " : "") + val;
    const currentWpm = Math.round((allTyped.length / 5 / elapsed) * 60);
    setWpm(currentWpm);
  }

  return (
    <GameShell
      title="Typing Race"
      description="Monkeytype-style raw speed test with random words. Finish typing to end the race instantly."
      icon="⌨️"
      score={wpm}
      highScore={bestWpm}
      scoreLabel="WPM"
      highScoreLabel="Best WPM"
      isPlaying={isPlaying}
      howToPlayText="Type each word and press Space to confirm. Race ends when you complete all words. Accuracy counts — wrong words add errors."
      customControls={
        <div className="flex flex-wrap items-center gap-3">
          {/* Word count selector */}
          <div className="flex rounded-xl border border-cyan-500/20 bg-slate-900/60 p-1">
            {([15, 25, 50, 100, "infinite"] as WordMode[]).map((mode) => (
              <button
                key={String(mode)}
                onClick={() => { setWordMode(mode); resetRace(mode, withPunctuation, withNumbers); }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                  wordMode === mode ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => { const next = !withPunctuation; setWithPunctuation(next); resetRace(wordMode, next, withNumbers); }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              withPunctuation ? "border-cyan-400 bg-cyan-950 text-cyan-200" : "border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            @ Punctuation
          </button>

          <button
            onClick={() => { const next = !withNumbers; setWithNumbers(next); resetRace(wordMode, withPunctuation, next); }}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              withNumbers ? "border-cyan-400 bg-cyan-950 text-cyan-200" : "border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            # Numbers
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        {/* Stats bar */}
        <div className="mb-5 flex w-full max-w-lg justify-around rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-3 text-center">
          {[
            { label: "WPM", val: wpm },
            { label: "Word", val: `${currentWord}/${wordMode === "infinite" ? "∞" : words.length}` },
            { label: "Errors", val: errors },
            { label: "Accuracy", val: `${accuracy}%` },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">{label}</p>
              <p className="text-lg font-bold tabular-nums text-cyan-300">{val}</p>
            </div>
          ))}
        </div>

        {/* Word display */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="mb-5 w-full max-h-40 overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950/90 px-6 py-5 text-left text-lg sm:text-xl leading-loose font-mono cursor-text select-none"
        >
          {words.map((word, wi) => {
            const isDone = wi < currentWord;
            const isCurrent = wi === currentWord;

            let wordClass = "text-slate-600"; // upcoming
            if (isDone) wordClass = "text-cyan-200/60"; // completed
            if (isCurrent) wordClass = "text-white"; // active

            return (
              <span
                key={`${wi}-${word}`}
                ref={(el) => { wordRefs.current[wi] = el; }}
                className={`mr-2 inline-block transition-colors duration-100 ${wordClass}`}
              >
                {isCurrent
                  ? word.split("").map((char, ci) => {
                      let charClass = "text-slate-400"; // untyped
                      if (ci < typed.length) {
                        charClass = typed[ci] === char ? "text-cyan-200" : "text-rose-400 bg-rose-950/60 rounded";
                      }
                      const isCaret = ci === typed.length;
                      return (
                        <span
                          key={ci}
                          className={`${charClass} ${isCaret ? "border-l-2 border-cyan-400 animate-pulse" : ""}`}
                        >
                          {char}
                        </span>
                      );
                    })
                  : word}
              </span>
            );
          })}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={handleInput}
          disabled={gameOver}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={isPlaying ? "" : "Start typing to begin…"}
          className="w-full rounded-2xl border-2 border-slate-700/80 bg-slate-900/60 px-4 py-3.5 font-mono text-base text-cyan-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 disabled:opacity-30 transition-colors"
        />

        {/* Completion panel */}
        {gameOver && (
          <div className="mt-6 w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 text-center space-y-1 animate-slide-up">
            <p className="text-2xl font-extrabold text-emerald-300">🏁 Race Complete!</p>
            <p className="text-sm text-slate-300">
              <strong className="text-white">{wpm} WPM</strong>
              {wpm > bestWpm && <span className="ml-2 rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-xs text-amber-300 font-bold">New best!</span>}
            </p>
            <p className="text-xs text-slate-400">Accuracy: {accuracy}% · Errors: {errors} words</p>
          </div>
        )}

        {/* CTA buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={startRace}
            className="rounded-2xl bg-cyan-500 px-8 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
          >
            {gameOver ? "Race again" : isPlaying ? "Restart" : "Start race"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
