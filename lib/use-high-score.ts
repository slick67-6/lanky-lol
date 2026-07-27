"use client";

import { useState, useCallback } from "react";

export function useHighScore(gameKey: string, initialDefault: number = 0) {
  const storageKey = `lanky_highscore_${gameKey}`;

  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === "undefined") return initialDefault;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    return initialDefault;
  });

  const updateHighScore = useCallback(
    (newScore: number): boolean => {
      let updated = false;
      setHighScore((prev) => {
        if (newScore > prev) {
          updated = true;
          try {
            localStorage.setItem(storageKey, newScore.toString());
          } catch {}
          return newScore;
        }
        return prev;
      });
      return updated;
    },
    [storageKey]
  );

  const resetHighScore = useCallback(() => {
    setHighScore(0);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  return { highScore, updateHighScore, resetHighScore };
}
