"use client";

import type { CSSProperties, PointerEvent, PropsWithChildren } from "react";

type SpotlightStyle = CSSProperties & {
  "--spotlight-x"?: string;
  "--spotlight-y"?: string;
};

export function SpotlightCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className={`group relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-white/[0.045] shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl ${className}`}
      style={{ "--spotlight-x": "50%", "--spotlight-y": "0%" } as SpotlightStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spotlight-x) var(--spotlight-y), rgba(125,211,252,0.14), transparent 42%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
