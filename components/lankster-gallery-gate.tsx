"use client";

import { ENABLE_LANKSTER_GALLERY_GATE } from "@/lib/lankster-gallery-flags";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LANKSTER_GALLERY_PASSWORD = "lanky";

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="34" viewBox="0 0 24 24" width="34">
      <rect
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
        width="16"
        x="4"
        y="10"
      />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path d="M12 14v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function LanksterGalleryGate() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  if (!ENABLE_LANKSTER_GALLERY_GATE) return null;

  function requestPassword() {
    const password = window.prompt("Enter the lankster gallery password:");

    if (password === LANKSTER_GALLERY_PASSWORD) {
      setMessage("");
      router.push("/lankster-gallery");
      return;
    }

    if (password !== null) setMessage("Nope — try again.");
  }

  return (
    <aside className="fixed left-4 top-4 z-40 max-w-[160px] text-left sm:left-6 sm:top-6">
      <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/90">
        lankster gallery
      </h2>
      <button
        aria-label="Unlock lankster gallery"
        className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/35 bg-slate-950/75 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-md transition-colors hover:border-cyan-300/70 hover:bg-cyan-950/70 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        onClick={requestPassword}
        type="button"
      >
        <LockIcon />
      </button>
      {message && <p className="mt-2 text-xs font-medium text-rose-300">{message}</p>}
    </aside>
  );
}
