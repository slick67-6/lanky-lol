"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const FLIP_WORDS = ["checkmate.", "brilliant.", "a blunder.", "one move.", "flow."];

export function FlipWords({ words = FLIP_WORDS, interval = 2600 }: { words?: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSwapping(true);
      window.setTimeout(() => setIndex((i) => (i + 1) % words.length), 210);
      window.setTimeout(() => setSwapping(false), 460);
    }, interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  return (
    <span
      className={`flip-word ${swapping ? "flip-word-active" : ""}`}
      aria-live="polite"
    >
      {words[index]}
    </span>
  );
}

type TickerProps = {
  to: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
};

export function NumberTicker({ to, decimals = 0, suffix = "", prefix = "", duration = 1700 }: TickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !started) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = to * eased;
      el.textContent = `${prefix}${decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()}${suffix}`;
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [started, to, decimals, suffix, prefix, duration]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

type MarqueeProps = {
  children: ReactNode;
  reverse?: boolean;
  slow?: boolean;
  className?: string;
};

export function Marquee({ children, reverse = false, slow = false, className = "" }: MarqueeProps) {
  return (
    <div
      className={`marquee ${reverse ? "marquee-reverse" : ""} ${slow ? "marquee-slow" : ""} ${className}`}
    >
      <div className="marquee-track">
        <div className="marquee-chunk flex shrink-0 items-center gap-4 pr-4">{children}</div>
        <div className="marquee-chunk flex shrink-0 items-center gap-4 pr-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  scale?: boolean;
};

export function Reveal({ children, className = "", delay = 0, scale = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-base ${scale ? "reveal-scale" : ""} ${inView ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

type TiltProps = {
  children: ReactNode;
  className?: string;
  max?: number;
};

export function TiltCard({ children, className = "", max = 7 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -2 * max;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
    };
    const reset = () => {
      el.style.transform = "";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt-card ${className}`}>
      {children}
    </div>
  );
}
