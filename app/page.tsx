"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme-context";
import { getRecentlyPlayed } from "@/lib/achievements";

export default function HomePage() {
  const { setIsCommandPaletteOpen } = useTheme();
  const [recentlyPlayedIds] = useState<string[]>(() => getRecentlyPlayed());

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100 selection:bg-cyan-500/30">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex flex-1 flex-col px-6 py-12">
          <div className="mx-auto w-full max-w-6xl">
            {/* Hero Section */}
            <div className="mb-16 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <span>✨ Web App & Arcade Suite 2026</span>
              </div>
              <h1 className="mb-6 font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-cyan-50 sm:text-6xl lg:text-7xl leading-tight">
                Tools & Games for <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-cyan-400 via-emerald-300 to-indigo-400 bg-clip-text text-transparent">
                  the Lanky Generation
                </span>
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-base text-slate-300 sm:text-lg leading-relaxed">
                Zero-asset loading times, synthesized Web Audio API sound effects, high score persistence, AI Vision & Document workspace, and real-time online multiplayer.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/games"
                  className="rounded-2xl bg-cyan-500 px-8 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105"
                >
                  🎮 Explore 18 Arcade Games
                </Link>
                <button
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 px-6 py-3.5 text-base font-bold text-cyan-200 transition-all hover:border-cyan-400/60 hover:bg-cyan-950/60"
                >
                  🔍 Command Launcher (⌘K)
                </button>
              </div>
            </div>

            {/* Recently Played Quick Launch Bar */}
            {recentlyPlayedIds.length > 0 && (
              <div className="mb-16 rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <span>⏱️</span> Continue Playing (Recently Launched)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {recentlyPlayedIds.map((id) => (
                    <Link
                      key={id}
                      href={`/games/${id}`}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition-colors"
                    >
                      🎮 {id.replace("-", " ").toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Featured AI Tools */}
            <div className="mb-16">
              <div className="mb-6">
                <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-100 sm:text-3xl">
                  🤖 AI Multimodal Tools
                </h2>
                <p className="text-sm text-slate-400">Powered by high-throughput streaming AI models.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Link
                  href="/analyser/image"
                  className="group rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-8 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_35px_rgba(34,211,238,0.2)]"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-3xl shadow-inner border border-cyan-500/30 group-hover:scale-110 transition-transform">
                    🖼️
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                    AI Vision Analyser
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Drop images, paste screenshots, and ask complex visual questions. Includes client-side compression & live streaming replies.
                  </p>
                </Link>

                <Link
                  href="/analyser/document"
                  className="group rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-8 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_35px_rgba(34,211,238,0.2)]"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-3xl shadow-inner border border-cyan-500/30 group-hover:scale-110 transition-transform">
                    📄
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                    AI Document Workspace
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Upload PDFs, Word docs, PowerPoint presentations, or TXT files. Automatically generate bullet notes, Q&A sets, and custom quizzes.
                  </p>
                </Link>
              </div>
            </div>

            {/* Live Statistics Banner */}
            <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Arcade Games", value: "18 Games", icon: "🕹️" },
                { label: "Audio Engine", value: "Web Audio API", icon: "🔊" },
                { label: "Multiplayer", value: "Real-Time Rooms", icon: "🌐" },
                { label: "High Scores", value: "localStorage Sync", icon: "🏆" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-6 text-center backdrop-blur-md"
                >
                  <span className="text-2xl mb-1 block">{stat.icon}</span>
                  <p className="text-lg font-extrabold text-cyan-300">{stat.value}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Featured Trending Games */}
            <div className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-100 sm:text-3xl">
                    🔥 Featured Games
                  </h2>
                  <p className="text-sm text-slate-400">Instant play with full mobile & keyboard support.</p>
                </div>
                <Link
                  href="/games"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                >
                  View All 18 Games →
                </Link>
              </div>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: "Online Chess", icon: "♟️", path: "/games/chess", desc: "Live 1v1 Real-Time Multiplayer Chess." },
                  { title: "Typing Race", icon: "⌨️", path: "/games/typing-race", desc: "Monkeytype-style raw typing test." },
                  { title: "Flappy Bird", icon: "🐦", path: "/games/flappy-bird", desc: "Dodge obstacles and set high scores." },
                  { title: "Tetris", icon: "🧩", path: "/games/tetris", desc: "Rotate blocks & clear line multipliers." },
                  { title: "Snake Classic", icon: "🐍", path: "/games/snake", desc: "Queue turns & speed up." },
                  { title: "Aim Trainer", icon: "🎯", path: "/games/aim-trainer", desc: "Target tracking & reaction delay." },
                ].map((g, idx) => (
                  <Link
                    key={idx}
                    href={g.path}
                    className="group flex items-center gap-4 rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-5 backdrop-blur-xl transition-all hover:border-cyan-400/50 hover:bg-slate-950/90"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-950/60 text-2xl shadow-inner border border-cyan-500/20 group-hover:scale-110 transition-transform">
                      {g.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-cyan-100 group-hover:text-cyan-300 transition-colors">
                        {g.title}
                      </h4>
                      <p className="text-xs text-slate-400">{g.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-cyan-500/20 bg-[#030712]/95 px-6 py-8 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-slate-500">
              © 2026 <strong>lanky.lol</strong>. Built for high performance and zero lag.
            </p>
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <Link href="/games" className="hover:text-cyan-300">
                Games
              </Link>
              <Link href="/analyser/image" className="hover:text-cyan-300">
                Image AI
              </Link>
              <Link href="/analyser/document" className="hover:text-cyan-300">
                Doc AI
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
