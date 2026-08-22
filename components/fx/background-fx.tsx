"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${pct}%`;
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[300] h-[3px] w-0"
      style={{
        background:
          "linear-gradient(90deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 40%, #a78bfa), #f472b6)",
        boxShadow: "0 0 12px color-mix(in srgb, var(--accent-primary) 60%, transparent)",
      }}
    />
  );
}

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
    };
    const loop = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] hidden h-[480px] w-[480px] rounded-full md:block"
      style={{
        opacity: 0,
        transition: "opacity 0.5s ease",
        background:
          "radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 11%, transparent) 0%, transparent 62%)",
      }}
    />
  );
}

export function AuroraBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="hero-grid-overlay" />
    </div>
  );
}

const METEOR_DELAYS = ["0.4s", "3.2s", "1.6s", "4.8s", "2.4s", "6.4s"];
const METEOR_LEFTS = ["8%", "26%", "45%", "63%", "81%", "93%"];

export function Meteors() {
  return (
    <div aria-hidden className="meteors-host">
      {METEOR_LEFTS.map((left, i) => (
        <span
          key={i}
          className="meteor-streak"
          style={{ left, animationDelay: METEOR_DELAYS[i] }}
        />
      ))}
    </div>
  );
}
