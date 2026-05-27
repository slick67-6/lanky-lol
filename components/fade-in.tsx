"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function FadeIn({ children, className = "", delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let fastScroll = false;
    let lastY = window.scrollY;
    let lastT = Date.now();

    const onScroll = () => {
      const now = Date.now();
      const speed = Math.abs(window.scrollY - lastY) / Math.max(now - lastT, 1);
      if (speed > 1.5) fastScroll = true;
      lastY = window.scrollY;
      lastT = now;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const wait = fastScroll ? 0 : delay;
          window.setTimeout(() => setShow(true), wait);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${className}`}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(24px)",
        transitionDuration: show ? "550ms" : "0ms",
      }}
    >
      {children}
    </div>
  );
}
