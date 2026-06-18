"use client";

import { ENABLE_LANKSTER_GALLERY_GATE } from "@/lib/lankster-gallery-flags";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isDialogOpen) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isDialogOpen]);

  if (!ENABLE_LANKSTER_GALLERY_GATE) return null;

  function openPasswordDialog() {
    setPassword("");
    setMessage("");
    setIsDialogOpen(true);
  }

  function closePasswordDialog() {
    setIsDialogOpen(false);
    setPassword("");
    setMessage("");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/lankster-gallery/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        closePasswordDialog();
        router.push("/lankster-gallery");
        return;
      }

      setMessage("Incorrect password — try again.");
    } catch {
      setMessage("Unable to check the password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <aside className="fixed left-4 top-4 z-40 max-w-[160px] text-left sm:left-6 sm:top-6">
        <h2 className="syne-text-safe font-[family-name:var(--font-syne)] text-sm font-bold uppercase leading-[1.45] tracking-[0.18em] text-cyan-100/90">
          Lankster Gallery
        </h2>
        <button
          aria-label="Unlock Lankster Gallery"
          className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/35 bg-slate-950/75 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-md transition-colors hover:border-cyan-300/70 hover:bg-cyan-950/70 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          onClick={openPasswordDialog}
          type="button"
        >
          <LockIcon />
        </button>
      </aside>

      {isDialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-5 text-cyan-50 shadow-[0_0_60px_rgba(34,211,238,0.2)]">
            <button
              aria-label="Close password window"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/40 bg-slate-900/85 text-xl font-semibold leading-none text-cyan-50 transition-colors hover:bg-cyan-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={closePasswordDialog}
              type="button"
            >
              ×
            </button>

            <div className="pr-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Locked window
              </p>
              <h2 className="mt-2 syne-text-safe font-[family-name:var(--font-syne)] text-2xl font-bold leading-[1.45]">
                Lankster gallery
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter the password to unlock the gallery.
              </p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={submitPassword}>
              <label
                className="block text-sm font-medium text-cyan-100"
                htmlFor="lankster-gallery-password"
              >
                Password
              </label>
              <input
                ref={inputRef}
                autoComplete="off"
                className="w-full rounded-2xl border border-cyan-400/25 bg-slate-900/80 px-4 py-3 text-cyan-50 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/25"
                id="lankster-gallery-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Type password"
                type="password"
                value={password}
              />
              {message && <p className="text-sm font-medium text-rose-300">{message}</p>}
              <button
                className="w-full rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-50 transition-colors hover:bg-cyan-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
