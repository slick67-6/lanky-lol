"use client";

import announcementPhoto from "@/iiegf2.jpeg";
import { ENABLE_LANKSTER_GALLERY_POPUP } from "@/lib/lankster-gallery-flags";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./lankster-gallery-announcement.module.css";

const POPUP_STORAGE_KEY = "lankster-gallery-announcement-seen";
const AUTO_CLOSE_DELAY_MS = 7000;

const CONFETTI_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#a78bfa", "#34d399"];

function ConfettiSide({ side }: { side: "left" | "right" }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const direction = side === "left" ? 1 : -1;
        const arc = index % 8;
        const endX = direction * (140 + arc * 18);
        const endY = -68 + (index % 6) * 26;
        const top = 24 + ((index * 11) % 44);

        return (
          <span
            aria-hidden="true"
            className={styles.confettiPiece}
            key={`${side}-${index}`}
            style={
              {
                "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                "--confetti-delay": `${index * 90}ms`,
                "--confetti-drift-x": `${direction * (42 + (index % 4) * 12)}px`,
                "--confetti-end-x": `${endX}px`,
                "--confetti-end-y": `${endY}px`,
                "--confetti-height": `${8 + (index % 3) * 3}px`,
                "--confetti-left": side === "left" ? "0%" : "100%",
                "--confetti-rotate": `${direction * (260 + index * 30)}deg`,
                "--confetti-top": `${top}%`,
                "--confetti-width": `${5 + (index % 2) * 4}px`,
              } as CSSProperties
            }
          />
        );
      }),
    [side],
  );

  return (
    <div
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

    const timeout = window.setTimeout(() => closePopup(), AUTO_CLOSE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  function closePopup() {
    window.sessionStorage.setItem(POPUP_STORAGE_KEY, "true");
    setIsOpen(false);
  }

  if (!ENABLE_LANKSTER_GALLERY_POPUP || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="relative flex max-h-[92dvh] w-full max-w-[min(92vw,34rem)] flex-col overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-3 text-center shadow-[0_0_70px_rgba(34,211,238,0.22)] sm:p-4">
        <ConfettiSide side="left" />
        <ConfettiSide side="right" />

        <button
          aria-label="Close announcement"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/50 bg-slate-950/90 text-2xl font-semibold leading-none text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-colors hover:bg-cyan-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:right-4 sm:top-4"
          onClick={closePopup}
          type="button"
        >
          ×
        </button>

        <div className="relative z-10 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70">
          <Image
            alt="Lankster gallery announcement"
            className="max-h-[62dvh] w-full object-contain"
            placeholder="blur"
            priority
            src={announcementPhoto}
          />
        </div>
        <p className="relative z-10 mt-3 font-[family-name:var(--font-syne)] text-xl font-bold text-cyan-50 sm:mt-4 sm:text-2xl">
          The lankster gallery is now out!
        </p>
      </div>
    </div>
  );
}
