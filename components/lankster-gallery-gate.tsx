"use client";

import { ENABLE_LANKSTER_GALLERY_GATE } from "@/lib/lankster-gallery-flags";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isPasswordOpen) return;

    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [isPasswordOpen]);

  if (!ENABLE_LANKSTER_GALLERY_GATE) return null;

  function openPasswordWindow() {
    setIsPasswordOpen(true);
    setMessage("");
  }

  function closePasswordWindow() {
    setIsPasswordOpen(false);
    setMessage("");
    setPassword("");
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === LANKSTER_GALLERY_PASSWORD) {
      closePasswordWindow();
      router.push("/lankster-gallery");
      return;
    }

    setMessage("Nope — try again.");
    setPassword("");
  }

  return (
    <>
      <aside className="fixed left-4 top-4 z-40 max-w-[160px] text-left sm:left-6 sm:top-6">
        <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/90">
          lankster gallery
        </h2>
        <button
          aria-label="Unlock lankster gallery"
          className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/35 bg-slate-950/75 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-md transition-colors hover:border-cyan-300/70 hover:bg-cyan-950/70 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          onClick={openPasswordWindow}
          type="button"
        >
          <LockIcon />
        </button>
      </aside>

      {isPasswordOpen && (
        <div
          aria-labelledby="lankster-gallery-password-title"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <form
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-6 text-left shadow-[0_0_70px_rgba(34,211,238,0.2)]"
            onSubmit={submitPassword}
          >
            <button
              aria-label="Close password window"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-900/80 text-xl font-semibold leading-none text-cyan-100 transition-colors hover:bg-cyan-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={closePasswordWindow}
              type="button"
            >
              ×
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-950/45 text-cyan-200">
              <LockIcon />
            </div>
            <h3
              className="mt-5 font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-50"
              id="lankster-gallery-password-title"
            >
              Unlock lankster gallery
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter the password to open the gallery.
            </p>

            <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80" htmlFor="lankster-gallery-password">
              Password
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-cyan-400/25 bg-slate-900/80 px-4 py-3 text-cyan-50 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/30"
              id="lankster-gallery-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              ref={inputRef}
              type="password"
              value={password}
            />
            {message && <p className="mt-3 text-sm font-medium text-rose-300">{message}</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-cyan-400/25 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-950/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={closePasswordWindow}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                type="submit"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
