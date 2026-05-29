"use client";

import { ENABLE_LANKSTER_GALLERY_GATE } from "@/lib/lankster-gallery-flags";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

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
  const passwordInputId = useId();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!ENABLE_LANKSTER_GALLERY_GATE) return null;

  function openPasswordWindow() {
    setPassword("");
    setMessage("");
    setIsPasswordOpen(true);
  }

  function closePasswordWindow() {
    setIsPasswordOpen(false);
    setPassword("");
    setMessage("");
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === LANKSTER_GALLERY_PASSWORD) {
      closePasswordWindow();
      router.push("/lankster-gallery");
      return;
    }

    setMessage("Nope — try again.");
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div
            aria-labelledby="lankster-gallery-password-title"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-950/95 p-5 text-cyan-50 shadow-[0_0_70px_rgba(34,211,238,0.2)]"
            role="dialog"
          >
            <button
              aria-label="Close password window"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-950/85 text-xl font-semibold leading-none text-cyan-100 transition-colors hover:bg-cyan-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={closePasswordWindow}
              type="button"
            >
              ×
            </button>

            <div className="pr-12">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/85">
                restricted
              </p>
              <h2
                className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-50"
                id="lankster-gallery-password-title"
              >
                Unlock lankster gallery
              </h2>
            </div>

            <form className="mt-6" onSubmit={submitPassword}>
              <label
                className="text-sm font-medium text-cyan-100/90"
                htmlFor={passwordInputId}
              >
                Password
              </label>
              <input
                autoComplete="off"
                autoFocus
                className="mt-2 w-full rounded-2xl border border-cyan-400/25 bg-slate-900/80 px-4 py-3 text-base text-cyan-50 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/35"
                id={passwordInputId}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (message) setMessage("");
                }}
                placeholder="Enter password"
                type="password"
                value={password}
              />
              {message && <p className="mt-3 text-sm font-medium text-rose-300">{message}</p>}

              <button
                className="mt-5 w-full rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.18em] text-cyan-50 transition hover:bg-cyan-400/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                type="submit"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
