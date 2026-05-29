"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
};

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const count = () => {
      const maxParticles = window.innerWidth < 640 ? 42 : 90;
      const density = window.innerWidth < 640 ? 18500 : 14000;
      return Math.min(maxParticles, Math.max(24, Math.floor((w * h) / density)));
    };

    const createParticle = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.35 + 0.08,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nextCount = count();
      if (particles.length === 0) {
        particles = Array.from({ length: nextCount }, createParticle);
        return;
      }

      particles = particles.slice(0, nextCount).map((particle) => ({
        ...particle,
        x: Math.min(particle.x, w),
        y: Math.min(particle.y, h),
      }));

      while (particles.length < nextCount) particles.push(createParticle());
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.35,
        0,
        w * 0.5,
        h * 0.35,
        Math.max(w, h) * 0.75,
      );
      grad.addColorStop(0, "rgba(8, 47, 73, 0.45)");
      grad.addColorStop(0.5, "rgba(3, 7, 18, 0.2)");
      grad.addColorStop(1, "rgba(3, 7, 18, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        if (!reduceMotionQuery.matches) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (!reduceMotionQuery.matches && document.visibilityState === "visible") {
        raf = requestAnimationFrame(draw);
      }
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reduceMotionQuery.addEventListener("change", start);
    start();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reduceMotionQuery.removeEventListener("change", start);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
