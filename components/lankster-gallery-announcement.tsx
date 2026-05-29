"use client";

import announcementPhoto from "@/iiegf2.jpeg";
import { ENABLE_LANKSTER_GALLERY_POPUP } from "@/lib/lankster-gallery-flags";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import styles from "./lankster-gallery-announcement.module.css";

const POPUP_STORAGE_KEY = "lankster-gallery-announcement-seen";

const CONFETTI_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#a78bfa", "#34d399"];

function ConfettiSide({ side }: { side: "left" | "right" }) {
  const pieces = Array.from({ length: 18 }, (_, index) => {
    const direction = side === "left" ? 1 : -1;
    const endX = direction * (150 + (index % 6) * 22);
    const startX = direction * -28;
    const top = 12 + ((index * 13) % 72);
    const endY = (index % 2 === 0 ? -1 : 1) * (18 + (index % 5) * 10);

    return (
      <span
        aria-hidden="true"
        className={styles.confettiPiece}
        key={`${side}-${index}`}
        style={
          {
            "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            "--confetti-delay": `${index * 55}ms`,
            "--confetti-end-x": `${endX}px`,
            "--confetti-end-y": `${endY}px`,
            "--confetti-height": `${8 + (index % 3) * 4}px`,
            "--confetti-left": side === "left" ? "0%" : "100%",
            "--confetti-rotate": `${direction * (220 + index * 28)}deg`,
            "--confetti-start-x": `${startX}px`,
            "--confetti-top": `${top}%`,
            "--confetti-width": `${4 + (index % 2) * 4}px`,
          } as CSSProperties
        }
      />
    );
  });

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 w-1/2 overflow-hidden ${
        side === "left" ? "left-0" : "right-0"
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

  function closePopup() {
    window.sessionStorage.setItem(POPUP_STORAGE_KEY, "true");
    setIsOpen(false);
  }

  if (!ENABLE_LANKSTER_GALLERY_POPUP || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-4 text-center shadow-[0_0_70px_rgba(34,211,238,0.22)]">
        <ConfettiSide side="left" />
        <ConfettiSide side="right" />

        <button
          aria-label="Close announcement"
          className="absolute right-4 top-4 z-10 rounded-full border border-cyan-400/30 bg-slate-950/80 px-3 py-1 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          onClick={closePopup}
          type="button"
        >
          ×
        </button>

        <div className="relative z-10 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70">
          <Image
            alt="Lankster gallery announcement"
            className="h-auto w-full object-cover"
            placeholder="blur"
            priority
            src={announcementPhoto}
          />
        </div>
        <p className="relative z-10 mt-5 font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-50 sm:text-3xl">
          The lankster gallery is now out!
        </p>
      </div>
    </div>
  );
}
