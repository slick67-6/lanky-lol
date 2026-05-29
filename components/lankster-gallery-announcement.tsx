"use client";

import announcementPhoto from "@/iiegf2.jpeg";
import { ENABLE_LANKSTER_GALLERY_POPUP } from "@/lib/lankster-gallery-flags";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./lankster-gallery-announcement.module.css";

const POPUP_STORAGE_KEY = "lankster-gallery-announcement-seen";
const AUTO_CLOSE_DELAY_MS = 7000;

const CONFETTI_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#a78bfa", "#34d399"];

type ConfettiPiece = {
  color: string;
  delay: string;
  duration: string;
  endX: string;
  endY: string;
  midX: string;
  midY: string;
  height: string;
  left: string;
  rotate: string;
  startX: string;
  top: string;
  width: string;
};

function ConfettiSide({ side }: { side: "left" | "right" }) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    const direction = side === "left" ? 1 : -1;

    return Array.from({ length: 24 }, (_, index) => {
      const row = index % 8;
      const burst = Math.floor(index / 8);
      const arc = row - 3.5;

      return {
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        delay: `${burst * 260 + row * 38}ms`,
        duration: `${2400 + (index % 5) * 180}ms`,
        endX: `${direction * (118 + burst * 46 + Math.abs(arc) * 10)}px`,
        endY: `${arc * 20 + (burst - 1) * 18}px`,
        height: `${8 + (index % 3) * 3}px`,
        midX: `${direction * ((118 + burst * 46 + Math.abs(arc) * 10) * 0.72)}px`,
        midY: `${arc * 20 + (burst - 1) * 18 - 26}px`,
        left: side === "left" ? "0%" : "100%",
        rotate: `${direction * (260 + index * 32)}deg`,
        startX: `${direction * -18}px`,
        top: `${18 + row * 8}%`,
        width: `${5 + (index % 2) * 4}px`,
      };
    });
  }, [side]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 w-1/2 overflow-hidden ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      {pieces.map((piece, index) => (
        <span
          className={styles.confettiPiece}
          key={`${side}-${index}`}
          style={
            {
              "--confetti-color": piece.color,
              "--confetti-delay": piece.delay,
              "--confetti-duration": piece.duration,
              "--confetti-end-x": piece.endX,
              "--confetti-end-y": piece.endY,
              "--confetti-height": piece.height,
              "--confetti-mid-x": piece.midX,
              "--confetti-mid-y": piece.midY,
              "--confetti-left": piece.left,
              "--confetti-rotate": piece.rotate,
              "--confetti-start-x": piece.startX,
              "--confetti-top": piece.top,
              "--confetti-width": piece.width,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function LanksterGalleryAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!ENABLE_LANKSTER_GALLERY_POPUP) return;

    const alreadySeen = window.sessionStorage.getItem(POPUP_STORAGE_KEY);
    if (alreadySeen) return;

    const frame = window.requestAnimationFrame(() => setIsOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => closePopup(), AUTO_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  function closePopup() {
    window.sessionStorage.setItem(POPUP_STORAGE_KEY, "true");
    setIsOpen(false);
  }

  if (!ENABLE_LANKSTER_GALLERY_POPUP || !isOpen) return null;

  return (
    <div
      aria-labelledby="lankster-gallery-announcement-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-8"
      role="dialog"
    >
      <div className="relative w-full max-w-[min(92vw,34rem)] overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-3 text-center shadow-[0_0_70px_rgba(34,211,238,0.22)] sm:p-4">
        <ConfettiSide side="left" />
        <ConfettiSide side="right" />

        <button
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/40 bg-slate-950/90 text-2xl font-semibold leading-none text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)] transition-colors hover:bg-cyan-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:right-4 sm:top-4"
          onClick={closePopup}
          type="button"
        >
          ×
        </button>

        <div className="relative z-10 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70">
          <Image
            alt="Lankster gallery announcement"
            className="max-h-[min(58vh,34rem)] w-full object-contain"
            placeholder="blur"
            priority
            src={announcementPhoto}
          />
        </div>
        <p
          className="relative z-10 mt-3 px-3 font-[family-name:var(--font-syne)] text-xl font-bold text-cyan-50 sm:mt-4 sm:text-3xl"
          id="lankster-gallery-announcement-title"
        >
          The lankster gallery is now out!
        </p>
      </div>
    </div>
  );
}
