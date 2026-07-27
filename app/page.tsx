import { FadeIn } from "@/components/fade-in";
import { LanksterGalleryAnnouncement } from "@/components/lankster-gallery-announcement";
import { LanksterGalleryGate } from "@/components/lankster-gallery-gate";
import { ParticlesBackground } from "@/components/particles-background";
import { ScrollArrow } from "@/components/scroll-arrow";
import { SiteHeader } from "@/components/site-header";
import { WordReveal } from "@/components/word-reveal";
import Image from "next/image";
import Link from "next/link";

const SHOW_HERO_IMAGE = true;

function ImageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.5" cy="10" r="1.75" fill="currentColor" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8l4 4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 4v4h4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function GamesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 12h4m-2-2v4m8-4h4m-2-2v4M3 12a9 9 0 1118 0 9 9 0 01-18 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-dvh w-full bg-[#030712] text-slate-100 selection:bg-cyan-500/30">
      <ParticlesBackground />
      <LanksterGalleryAnnouncement />
      <LanksterGalleryGate />

      <SiteHeader />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="scroll-snap-section flex min-h-dvh w-full flex-col items-center justify-center px-6 pb-16 pt-12 text-center snap-start">
          <FadeIn delay={200}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                lanky.lol v2.6 Engine
              </span>
            </div>
          </FadeIn>

          <WordReveal text="Tools for the Fools" wordDelay={280} />

          <FadeIn delay={600}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              The lankiest, sleekest AI vision, document analysis, and browser arcade suite — engineered for lightning speed on desktop and mobile.
            </p>
          </FadeIn>

          <FadeIn delay={800}>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/games"
                className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-400 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                🎮 Play Games Arcade
              </Link>
              <Link
                href="/analyser/image"
                className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 px-6 py-3 text-sm font-semibold text-cyan-300 backdrop-blur-md transition-all hover:border-cyan-400/60 hover:bg-cyan-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                👁️ AI Vision Analyser
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={1000}>
            <ScrollArrow />
          </FadeIn>

          {SHOW_HERO_IMAGE && (
            <FadeIn delay={1200}>
              <div className="mx-auto mt-8 w-full max-w-[min(88vw,28rem)] overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950/60 p-2 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.45)] backdrop-blur-xl transition-all hover:border-cyan-400/50">
                <Image
                  src="/langster-gangster.png"
                  alt="Langster gangster at a futuristic workstation"
                  width={820}
                  height={1280}
                  priority
                  className="h-auto max-h-[34dvh] w-full rounded-2xl object-contain object-center sm:max-h-[40dvh]"
                />
              </div>
            </FadeIn>
          )}
        </section>

        {/* Tools Showcase Section */}
        <section className="scroll-snap-section flex min-h-dvh w-full flex-col items-center justify-center px-6 py-20 snap-start">
          <FadeIn>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Suite Overview</span>
              <h2 className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
                Pick Your Tool
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
                Three specialized modules powered by multimodal AI and zero-latency browser engines.
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: AI Vision */}
            <FadeIn delay={100}>
              <Link
                href="/analyser/image"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                      <ImageIcon />
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Live
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                    AI Image Analyser
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Upload or paste any image to extract objects, text, code UI designs, and deep visual context.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-300 group-hover:translate-x-1 transition-transform">
                  <span>Open Vision Studio</span>
                  <span>→</span>
                </div>
              </Link>
            </FadeIn>

            {/* Card 2: AI Document */}
            <FadeIn delay={200}>
              <Link
                href="/analyser/document"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                      <DocumentIcon />
                    </div>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3 py-1 text-xs font-semibold text-cyan-300">
                      Ready
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                    AI Document Workspace
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Parse PDFs, Word docs, PowerPoints, and text files into key notes, Q&A pairs, and interactive quizzes.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-300 group-hover:translate-x-1 transition-transform">
                  <span>Open Document Studio</span>
                  <span>→</span>
                </div>
              </Link>
            </FadeIn>

            {/* Card 3: Browser Games */}
            <FadeIn delay={300}>
              <Link
                href="/games"
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:bg-slate-950/90 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:col-span-2 lg:col-span-1"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                      <GamesIcon />
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-300">
                      10 Games
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-cyan-100 group-hover:text-cyan-400 transition-colors">
                    Arcade Games Hub
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Snake, Pong, Breakout, 2048, Minesweeper, Trivia, Memory, Typing Race, Whack-a-Mole, and Tic Tac Toe.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-300 group-hover:translate-x-1 transition-transform">
                  <span>Launch Arcade Hub</span>
                  <span>→</span>
                </div>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>
    </div>
  );
}
