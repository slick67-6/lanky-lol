"use client";

import announcementPhoto from "@/iiegf2.jpeg";
import { ENABLE_LANKSTER_GALLERY_POPUP } from "@/lib/lankster-gallery-flags";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import styles from "./lankster-gallery-announcement.module.css";

const POPUP_STORAGE_KEY = "lankster-gallery-announcement-seen";
const AUTO_CLOSE_DELAY_MS = 7000;

const CONFETTI_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#a78bfa", "#34d399"];

function ConfettiSide({ side }: { side: "left" | "right" }) {
  const pieces = Array.from({ length: 24 }, (_, index) => {
    const direction = side === "left" ? 1 : -1;
    const row = index % 8;
    const burst = Math.floor(index / 8);
    const endX = direction * (118 + row * 18 + burst * 14);
    const startX = direction * -18;
    const top = 22 + row * 7 + burst * 3;
    const endY = 46 + ((index * 17) % 82);
    const arcY = 18 + ((index * 11) % 48);

    return (
      <span
        aria-hidden="true"
        className={styles.confettiPiece}
        key={`${side}-${index}`}
        style={
          {
            "--confetti-arc-y": `${arcY}px`,
            "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            "--confetti-delay": `${burst * 360 + row * 70}ms`,
            "--confetti-end-x": `${endX}px`,
            "--confetti-end-y": `${endY}px`,
            "--confetti-height": `${7 + (index % 3) * 4}px`,
            "--confetti-left": side === "left" ? "0%" : "100%",
            "--confetti-rotate": `${direction * (260 + index * 34)}deg`,
            "--confetti-start-x": `${startX}px`,
            "--confetti-top": `${top}%`,
            "--confetti-width": `${4 + (index % 2) * 5}px`,
          } as CSSProperties
        }
      />
    );
  });

  return (
    <div
      aria-hidden="true"
      className={`${styles.confettiSide} ${
        side === "left" ? styles.confettiSideLeft : styles.confettiSideRight
      }`}
    >
      {pieces}
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
      <div
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-3 text-center shadow-[0_0_70px_rgba(34,211,238,0.22)] sm:max-h-[calc(100dvh-4rem)] sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lankster-gallery-announcement-title"
      >
        <ConfettiSide side="left" />
        <ConfettiSide side="right" />

        <button
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/40 bg-slate-950/90 text-2xl font-semibold leading-none text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.24)] transition-colors hover:bg-cyan-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:right-4 sm:top-4"
          onClick={closePopup}
          type="button"
        >
          ×
        </button>

        <div className="relative z-10 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70">
          <Image
            alt="Lankster gallery announcement"
            className="mx-auto h-auto max-h-[62dvh] w-auto max-w-full object-contain"
            placeholder="blur"
            priority
            src={announcementPhoto}
          />
        </div>
        <p
          className="relative z-10 mt-3 px-4 font-[family-name:var(--font-syne)] text-xl font-bold text-cyan-50 sm:mt-5 sm:text-3xl"
          id="lankster-gallery-announcement-title"
        >
          The lankster gallery is now out!
        </p>
      </div>
    </div>
  );
}
