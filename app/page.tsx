"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ParticlesBackground } from "@/components/particles-background";
import { getRecentlyPlayed } from "@/lib/achievements";

const FEATURED_GAMES = [
  { id: "typing-race", title: "Typing Race", icon: "⌨️", path: "/games/typing-race", desc: "Test raw typing speed with random words" },
  { id: "flappy-bird", title: "Flappy Bird", icon: "🐦", path: "/games/flappy-bird", desc: "Dodge pipes, beat your high score" },
  { id: "tetris", title: "Tetris", icon: "🧩", path: "/games/tetris", desc: "Rotate blocks, clear lines" },
  { id: "snake", title: "Snake", icon: "🐍", path: "/games/snake", desc: "Classic queue-turn snake" },
  { id: "aim-trainer", title: "Aim Trainer", icon: "🎯", path: "/games/aim-trainer", desc: "Click shrinking targets fast" },
  { id: "minesweeper", title: "Minesweeper", icon: "💣", path: "/games/minesweeper", desc: "Don&apos;t hit a mine" },
];

const STATS = [
  { label: "Arcade games", value: "17" },
  { label: "Online chess", value: "Live" },
  { label: "No sign-up", value: "Free" },
];

export default function HomePage() {
  const [recent] = useState<string[]>(() => getRecentlyPlayed());

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100 selection:bg-white/20">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* ── Hero ── */}
          <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-white/50 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online chess matchmaking live
            </div>

            <h1 className="mb-5 max-w-xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
              Play chess.
              <br />
              <span className="text-white/30">No account.</span>
            </h1>

            <p className="mb-8 max-w-md text-base text-white/40 leading-relaxed sm:text-lg">
              Find a live opponent in seconds, or pick from 17 arcade games. Everything runs in your browser.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/chess"
                className="rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-[#030712] transition-all hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                ♟ Find a match
              </Link>
              <Link
                href="/games"
                className="rounded-2xl border border-white/15 bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all hover:border-white/25 hover:bg-white/[0.09] hover:text-white"
              >
                Arcade games
              </Link>
            </div>
          </section>

          {/* ── Stats row ── */}
          <section className="mx-auto mb-16 flex w-full max-w-3xl justify-center gap-0 px-6">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center py-5 ${
                  i < STATS.length - 1 ? "border-r border-white/[0.07]" : ""
                }`}
              >
                <span className="text-2xl font-extrabold tracking-tight text-white">{s.value}</span>
                <span className="mt-1 text-xs text-white/30 font-medium">{s.label}</span>
              </div>
            ))}
          </section>

          <div className="mx-auto w-full max-w-5xl px-6 pb-20 space-y-16">

            {/* ── Recently played ── */}
            {recent.length > 0 && (
              <section>
                <h2 className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/25">
                  Continue playing
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recent.map((id) => (
                    <Link
                      key={id}
                      href={`/games/${id}`}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/50 transition-all hover:border-white/15 hover:bg-white/[0.07] hover:text-white/80"
                    >
                      {id.replace(/-/g, " ")}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Chess feature card ── */}
            <section>
              <h2 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/25">
                Featured
              </h2>
              <Link
                href="/chess"
                className="group block rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-4xl">♟</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">Lanky Chess</h3>
                        <p className="text-sm text-white/35">1v1 online matchmaking</p>
                      </div>
                    </div>
                    <p className="max-w-sm text-sm text-white/40 leading-relaxed">
                      Click Find a Match and you&apos;re paired with a real opponent automatically. No rooms, no lobbies, no accounts.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-6 py-3 text-sm font-bold text-white transition-all group-hover:bg-white/[0.12]">
                    Play now →
                  </div>
                </div>
              </Link>
            </section>

            {/* ── Arcade grid ── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/25">
                  Arcade games
                </h2>
                <Link
                  href="/games"
                  className="text-xs font-semibold text-white/30 hover:text-white/60 transition-colors"
                >
                  View all 17 →
                </Link>
              </div>
              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURED_GAMES.map((g) => (
                  <Link
                    key={g.path}
                    href={g.path}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all hover:border-white/[0.13] hover:bg-white/[0.055]"
                  >
                    <span className="text-2xl shrink-0">{g.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">
                        {g.title}
                      </div>
                      <div className="text-xs text-white/30 truncate">{g.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Tools section ── */}
            <section>
              <h2 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/25">
                Tools
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  { href: "/analyser/image", icon: "🖼️", title: "Image Analyser", desc: "Upload an image or screenshot for instant analysis" },
                  { href: "/analyser/document", icon: "📄", title: "Document Workspace", desc: "Upload PDFs, docs or slides to generate notes and Q&A" },
                ].map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 transition-all hover:border-white/[0.13] hover:bg-white/[0.055]"
                  >
                    <span className="text-2xl shrink-0">{t.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{t.title}</div>
                      <div className="text-xs text-white/30 leading-snug mt-0.5">{t.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </main>

        <footer className="border-t border-white/[0.06] px-6 py-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-white/20">© 2026 lanky.lol</p>
            <div className="flex gap-5 text-xs font-medium text-white/25">
              <Link href="/chess" className="hover:text-white/50 transition-colors">Chess</Link>
              <Link href="/games" className="hover:text-white/50 transition-colors">Arcade</Link>
              <Link href="/analyser/image" className="hover:text-white/50 transition-colors">Image</Link>
              <Link href="/analyser/document" className="hover:text-white/50 transition-colors">Docs</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
