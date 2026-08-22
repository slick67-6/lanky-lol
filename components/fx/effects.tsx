"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

export function Sparkles({ density = 64 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let sparks: { x: number; y: number; r: number; phase: number; speed: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparks = Array.from({ length: density }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        r: Math.random() * 1.8 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.014 + Math.random() * 0.03,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const s of sparks) {
        s.phase += s.speed;
        const a = 0.12 + Math.abs(Math.sin(s.phase)) * 0.85;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.shadowColor = `rgba(160, 200, 255, ${a})`;
        ctx.shadowBlur = 9;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

type BeamCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  duration?: number;
};

export function BorderBeamCard({ children, className = "", style, duration = 4.5 }: BeamCardProps) {
  return (
    <div className={`beam-card ${className}`} style={style}>
      <div aria-hidden className="beam-ring" style={{ ["--beam-duration" as string]: `${duration}s` }}>
        <div className="beam-conic" />
      </div>
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
