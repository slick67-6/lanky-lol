"use client";

import { useEffect, useRef, useState } from "react";

type WordRevealProps = {
  text: string;
  className?: string;
  /** Base ms per word */
  wordDelay?: number;
};

export function WordReveal({
  text,
  className = "",
  wordDelay = 220,
}: WordRevealProps) {
  const words = text.split(/\s+/);
  const [visibleCount, setVisibleCount] = useState(0);
  const [instant, setInstant] = useState(false);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const now = Date.now();
      const previousScrollTime = lastScrollTime.current ?? now;
      const dy = Math.abs(window.scrollY - lastScrollY.current);
      const dt = now - previousScrollTime;
      if (dt > 0 && dy / dt > 1.8) {
        setInstant(true);
        setVisibleCount(words.length);
      }
      lastScrollY.current = window.scrollY;
      lastScrollTime.current = now;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [words.length]);

  useEffect(() => {
    if (instant) return;
    if (visibleCount >= words.length) return;
    const delay = wordDelay;
    const t = window.setTimeout(
      () => setVisibleCount((c) => c + 1),
      visibleCount === 0 ? 400 : delay,
    );
    return () => window.clearTimeout(t);
  }, [visibleCount, words.length, wordDelay, instant]);

  return (
    <h1
      className={`font-[family-name:var(--font-syne)] text-4xl font-bold leading-[1.35] tracking-tight text-cyan-50 sm:text-5xl md:text-6xl lg:text-7xl ${className}`}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="mr-[0.28em] inline-block overflow-visible py-[0.08em] transition-all duration-500 ease-out"
          style={{
            opacity: i < visibleCount ? 1 : 0,
            transform:
              i < visibleCount ? "translateY(0)" : "translateY(0.65em)",
            filter: i < visibleCount ? "blur(0)" : "blur(4px)",
            transitionDuration: instant ? "120ms" : undefined,
          }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
}
