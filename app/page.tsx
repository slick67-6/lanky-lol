"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ParticlesBackground } from "@/components/particles-background";
import { AuroraBackground, CursorGlow, Meteors, ScrollProgress } from "@/components/fx/background-fx";
import { FlipWords, Marquee, NumberTicker, Reveal, TiltCard } from "@/components/fx/motion";
import { BorderBeamCard, Sparkles } from "@/components/fx/effects";

const VIDEO_SOURCES = [
  "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
];

const CAPABILITIES = [
  ["♟️", "Instant matchmaking"],
  ["🤖", "AI vision analysis"],
  ["📄", "Document Q&A"],
  ["⚡", "Sub-second moves"],
  ["🔒", "Zero accounts"],
  ["🎨", "Custom themes"],
  ["⌨️", "⌘K everywhere"],
  ["🌐", "Runs in your browser"],
];

const STATS = [
  { to: 24, suffix: "/7", label: "Opponents online" },
  { to: 1.8, decimals: 1, suffix: "s", label: "Avg. pairing time" },
  { to: 2, suffix: "", label: "AI analysers" },
  { to: 100, suffix: "%", label: "Free forever" },
];

const QUOTES_ROW_1 = [
  { text: "Found an opponent in under two seconds. I closed three chess apps after trying this.", name: "Sara K.", role: "1800 rapid", initial: "S" },
  { text: "Uploaded a 40-page PDF before my seminar and walked in with full notes. Unreal.", name: "Diego R.", role: "Grad student", initial: "D" },
  { text: "The whole site feels like one person with immaculate taste built it. Every pixel moves on purpose.", name: "Lena O.", role: "Design lead", initial: "L" },
  { text: "No sign-up, no ads, no nonsense. Just chess and genuinely useful AI tools.", name: "Jae P.", role: "Indie hacker", initial: "J" },
];

const QUOTES_ROW_2 = [
  { text: "The vision analyser read my handwritten lab notes better than I could.", name: "Rio T.", role: "Researcher", initial: "R" },
  { text: "⌘K opens everything. It's the little things that make this feel premium.", name: "Emma N.", role: "Product manager", initial: "E" },
  { text: "Switched to the AMOLED theme and now it's my late-night chess home.", name: "Tomas V.", role: "Night owl", initial: "T" },
  { text: "Pairing, playing, rematching — zero friction. This is how chess online should feel.", name: "Nia A.", role: "Club player", initial: "N" },
];

const FAQS = [
  {
    q: "How does chess matchmaking work?",
    a: "Hit Find a Match and you're paired with a real opponent automatically — no rooms, no lobbies, no accounts. Pick a time control (1, 5 or 10 minutes) and you're playing within seconds.",
  },
  {
    q: "Is lanky.lol really free?",
    a: "Yes — every feature is free, with no sign-up wall and no hidden limits. Chess, the vision analyser and the document workspace all run without an account.",
  },
  {
    q: "What can the AI tools analyse?",
    a: "The Image Analyser handles screenshots, photos, diagrams and handwriting. The Document Workspace supports PDF, DOCX, PPTX and XLSX — generating summaries, notes and Q&A from your files.",
  },
  {
    q: "Do you store my uploads?",
    a: "Your files are processed for your session only. Nothing is pinned to a profile because there are no profiles — close the tab and it's gone.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. The board, analysers and animations are tuned for touch and small screens, with reduced particle density so it stays smooth on phones.",
  },
];

function ShimmerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative isolate inline-flex items-center gap-2 overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-[#030712] transition-all hover:-translate-y-0.5 active:translate-y-0"
      style={{
        background: "var(--accent-primary)",
        boxShadow: "0 8px 32px color-mix(in srgb, var(--accent-primary) 35%, transparent)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 translate-x-[-120%] bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.75)_45%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[120%]"
      />
      {children}
    </Link>
  );
}

function PairingLog() {
  const rows = [
    { label: "search.pool.join()", detail: "queued · elo ±120" },
    { label: "opponent.found", detail: "1.8s · guest-2841" },
    { label: "game.start", detail: "5+0 rapid · white" },
  ];
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 font-mono text-[12.5px] leading-loose">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="text-white/55">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle animate-pulse" />
            {r.label}
          </span>
          <span className="shrink-0 text-white/25">{r.detail}</span>
        </div>
      ))}
      <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full w-2/5 rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--accent-primary), #a78bfa)",
            animation: "load-slide 2.4s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

function PulseGrid() {
  return (
    <div className="mt-5 grid grid-cols-3 gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="h-11 rounded-xl border border-white/[0.08]"
          style={{
            background: i % 3 === 0 ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)" : "rgba(255,255,255,0.03)",
            animation: `cell-pulse 2.6s ease-in-out ${i * 0.42}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SparkBars() {
  const bars = [38, 62, 34, 78, 52, 88, 44, 70, 58, 94];
  return (
    <div className="mt-5 flex h-24 items-end gap-2">
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1 origin-bottom rounded-md"
          style={{
            height: `${h}%`,
            background:
              i % 3 === 0
                ? "linear-gradient(to top, color-mix(in srgb, #f472b6 22%, transparent), #f472b6)"
                : "linear-gradient(to top, color-mix(in srgb, var(--accent-primary) 22%, transparent), var(--accent-primary))",
            animation: `bar-breathe 2.8s ease-in-out ${(i % 5) * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);

  const startFallback = useCallback(() => {
    setFailed(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      t += 0.008;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#060a16");
      grad.addColorStop(1, "#0c1030");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      const hues = ["rgba(124,92,246,0.32)", "rgba(34,211,238,0.26)", "rgba(244,114,182,0.2)"];
      hues.forEach((c, ci) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y =
            h * (0.45 + ci * 0.14) +
            Math.sin(x * 0.006 + t * (1.2 + ci * 0.4)) * (46 + ci * 18) +
            Math.sin(x * 0.002 - t * 0.7) * 26;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = c;
        ctx.lineWidth = 90;
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sources = Array.from(video.querySelectorAll("source"));
    const lastIdx = sources.length - 1;
    const onSourceError = (e: Event) => {
      if (sources.indexOf(e.target as HTMLSourceElement) === lastIdx) startFallback();
    };
    sources.forEach((s) => s.addEventListener("error", onSourceError));
    video.addEventListener("error", startFallback);
    const timeout = window.setTimeout(() => {
      if (video.readyState === 0) startFallback();
    }, 7000);
    return () => {
      sources.forEach((s) => s.removeEventListener("error", onSourceError));
      video.removeEventListener("error", startFallback);
      window.clearTimeout(timeout);
    };
  }, [startFallback]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  return (
    <Reveal scale>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/[0.12] shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
        style={{ background: "#070a17" }}
      >
        <BorderBeamCard
          className="absolute inset-0 z-10 rounded-[28px]"
          duration={7}
        >
          <span className="hidden" />
        </BorderBeamCard>

        {!failed ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          >
            {VIDEO_SOURCES.map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>
        ) : null}
        <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full object-cover ${failed ? "" : "hidden"}`} />

        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-[#030712]/90 via-[#030712]/25 to-transparent p-7 sm:p-9">
          <h3 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-white sm:text-[27px]">
            lanky.lol in motion
          </h3>
          <p className="mt-1 text-sm text-white/50">Live footage layered under real-time canvas effects</p>
          <div className="absolute bottom-6 right-6 flex gap-2.5 sm:right-9">
            <button
              type="button"
              onClick={togglePlay}
              disabled={failed}
              aria-label={playing ? "Pause video" : "Play video"}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:scale-110 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.09)" }}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={failed}
              aria-label="Toggle sound"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/25 text-white backdrop-blur-md transition hover:scale-110 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.09)" }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function QuoteCard({ quote }: { quote: (typeof QUOTES_ROW_1)[number] }) {
  return (
    <figure className="w-[340px] shrink-0 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-sm transition-colors hover:border-white/[0.16] sm:w-[400px]">
      <blockquote className="mb-5 text-[15px] leading-relaxed text-slate-200/85">&ldquo;{quote.text}&rdquo;</blockquote>
      <figcaption className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-[#030712]" style={{ background: "var(--accent-primary)" }}>
          {quote.initial}
        </span>
        <span className="flex flex-col leading-tight">
          <strong className="text-sm font-semibold text-white/85">{quote.name}</strong>
          <em className="text-xs not-italic text-white/30">{quote.role}</em>
        </span>
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip text-slate-100 selection:bg-white/20" style={{ background: "var(--bg)" }}>
      <ScrollProgress />
      <CursorGlow />
      <ParticlesBackground />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* ── Hero ── */}
          <section className="relative flex flex-col items-center overflow-hidden px-6 pb-20 pt-24 text-center">
            <AuroraBackground />
            <Meteors />

            <div className="relative z-[3] mx-auto max-w-4xl">
              <Link
                href="/chess"
                className="animate-slide-up anim-delay-0 mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/[0.14] bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-white/55 backdrop-blur-sm transition-all hover:border-white/30 hover:text-white/85"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online chess matchmaking is live
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>

              <h1 className="animate-slide-up anim-delay-1 mb-6 font-[family-name:var(--font-syne)] text-5xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Play chess.
                <br />
                No account.
                <br />
                Just <FlipWords />
              </h1>

              <p className="animate-slide-up anim-delay-2 mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/40 sm:text-lg">
                Get paired with a real opponent in seconds, then sharpen your prep with AI that reads your images and documents.
                Everything runs right in your browser — free, forever.
              </p>

              <div className="animate-slide-up anim-delay-3 mb-10 flex flex-wrap items-center justify-center gap-3">
                <ShimmerLink href="/chess">
                  ♟ Find a match
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </ShimmerLink>
                <Link
                  href="/analyser/image"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.15] bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M5 19l5.5-5.5 3 3L18 12l3 3" /></svg>
                  Try the AI tools
                </Link>
              </div>

              <p className="animate-slide-up anim-delay-4 text-xs font-medium tracking-wide text-white/25">
                No downloads · No sign-up · No ads
              </p>
            </div>

            <Reveal delay={150} scale className="relative z-[3] mt-16 w-full max-w-xl">
              <BorderBeamCard className="rounded-3xl">
                <div className="overflow-hidden rounded-3xl border border-white/[0.12] shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl" style={{ background: "linear-gradient(160deg, rgba(20,24,44,0.85), rgba(8,10,22,0.88))" }}>
                  <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 font-mono text-xs text-white/35">matchmaking.log</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-black tracking-[0.14em] text-rose-300">
                      LIVE
                    </span>
                  </div>
                  <div className="p-5 text-left">
                    <PairingLog />
                  </div>
                </div>
              </BorderBeamCard>
            </Reveal>
          </section>

          {/* ── Capability marquee ── */}
          <section className="border-y border-white/[0.07] bg-white/[0.015] py-9">
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-white/25">
              What you get
            </p>
            <Marquee>
              {CAPABILITIES.map(([icon, label]) => (
                <span
                  key={label}
                  className="whitespace-nowrap rounded-2xl border border-white/[0.08] bg-white/[0.02] px-7 py-3.5 font-[family-name:var(--font-syne)] text-lg font-semibold text-white/45 transition-colors hover:border-white/25 hover:text-white/90"
                >
                  {icon} {label}
                </span>
              ))}
            </Marquee>
          </section>

          {/* ── Bento features ── */}
          <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24">
            <Reveal className="mb-14 text-center">
              <span className="mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.24em]" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 35%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 9%, transparent)" }}>
                FEATURES
              </span>
              <h2 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Two obsessions,
                <br />
                <span className="gradient-flow-text">executed perfectly.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/40">
                A frictionless chess experience and a pair of sharp AI analysers — nothing bloated between you and the thing you came for.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Reveal scale className="md:col-span-2">
                <BorderBeamCard className="h-full rounded-[28px]">
                  <div className="h-full overflow-hidden rounded-[28px] border border-white/[0.1] bg-white/[0.04] p-8 backdrop-blur-xl transition-colors hover:border-white/[0.2]">
                    <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl p-3.5 text-3xl" style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", boxShadow: "0 0 24px color-mix(in srgb, var(--accent-primary) 25%, transparent)" }}>
                      ♟
                    </div>
                    <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">Online chess, zero ceremony</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
                      One click pairs you with a live opponent. Atomic move sync, premoves, and instant rematch — at 60fps on any device.
                    </p>
                    <div className="mt-5">
                      <PairingLog />
                    </div>
                  </div>
                </BorderBeamCard>
              </Reveal>

              <Reveal scale delay={90}>
                <div className="group h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.055]">
                  <div className="mb-5 inline-flex rounded-2xl bg-pink-400/10 p-3.5 text-2xl shadow-[0_0_22px_rgba(244,114,182,0.18)]">🖼️</div>
                  <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">Vision Analyser</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Drop in a screenshot, diagram or photo of handwritten notes. Get structured answers instantly.
                  </p>
                </div>
              </Reveal>

              <Reveal scale delay={140} className="md:row-span-2">
                <div className="flex h-full flex-col rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:border-white/[0.2] hover:bg-white/[0.05]">
                  <div className="mb-5 inline-flex w-fit rounded-2xl bg-cyan-400/10 p-3.5 text-2xl shadow-[0_0_22px_rgba(34,211,238,0.2)]">📄</div>
                  <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">Document Workspace</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Upload PDF, DOCX, PPTX or XLSX. The workspace extracts everything, then generates clean notes, flashcards and Q&amp;A you can chat with.
                  </p>
                  <PulseGrid />
                  <p className="mt-auto pt-5 text-xs text-white/25">Parsed locally in your browser where possible.</p>
                </div>
              </Reveal>

              <Reveal scale delay={190}>
                <div className="group h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.055]">
                  <div className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-black/40 px-3 py-1.5 font-mono text-xs text-white/60">
                    ⌘ K
                  </div>
                  <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">Command palette</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Jump anywhere instantly. Every corner of the site is one keystroke away.
                  </p>
                </div>
              </Reveal>

              <Reveal scale delay={240} className="md:col-span-2">
                <div className="h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:border-white/[0.2] hover:bg-white/[0.05]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-5 inline-flex rounded-2xl bg-amber-400/10 p-3.5 text-2xl shadow-[0_0_22px_rgba(251,191,36,0.18)]">🎨</div>
                      <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">Yours, visually</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
                        Accent palettes, AMOLED black, true light mode — the entire interface bends to your taste.
                      </p>
                    </div>
                    <SparkBars />
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="mx-auto w-full max-w-5xl px-6 pb-24">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} scale delay={i * 80}>
                  <div className="rounded-[24px] border border-white/[0.09] bg-white/[0.03] p-7 text-center transition-all hover:-translate-y-1.5 hover:border-white/[0.2]">
                    <div className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight gradient-flow-text">
                      <NumberTicker to={s.to} decimals={s.decimals} suffix={s.suffix} />
                    </div>
                    <div className="mt-2 text-xs font-medium text-white/30">{s.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Showcase video ── */}
          <section className="mx-auto w-full max-w-4xl px-6 pb-24">
            <Reveal className="mb-12 text-center">
              <span className="mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.24em]" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 35%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 9%, transparent)" }}>
                SHOWCASE
              </span>
              <h2 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Feel the motion.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-white/40">
                Cinematic backgrounds meet real-time canvas rendering — buttery on desktop, graceful on mobile.
              </p>
            </Reveal>
            <VideoShowcase />
          </section>

          {/* ── Testimonials ── */}
          <section className="pb-24">
            <Reveal className="mb-12 px-6 text-center">
              <span className="mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.24em]" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 35%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 9%, transparent)" }}>
                WALL OF LOVE
              </span>
              <h2 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Players <span className="gradient-flow-text">stay</span> for the feel.
              </h2>
            </Reveal>
            <div className="space-y-5">
              <Marquee slow>
                {QUOTES_ROW_1.map((q) => (
                  <TiltCard key={q.name}>
                    <QuoteCard quote={q} />
                  </TiltCard>
                ))}
              </Marquee>
              <Marquee slow reverse>
                {QUOTES_ROW_2.map((q) => (
                  <TiltCard key={q.name}>
                    <QuoteCard quote={q} />
                  </TiltCard>
                ))}
              </Marquee>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="mx-auto w-full max-w-3xl px-6 pb-24">
            <Reveal className="mb-12 text-center">
              <span className="mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.24em]" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 35%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 9%, transparent)" }}>
                FAQ
              </span>
              <h2 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Questions? <span className="gradient-flow-text">Answered.</span>
              </h2>
            </Reveal>
            <Reveal delay={100} className="space-y-3.5">
              {FAQS.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] transition-colors open:border-white/[0.18] open:bg-white/[0.05]"
                >
                  <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-white/85 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0 text-white/30 transition-transform duration-300 group-open:rotate-180 group-open:text-white/70">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="animate-slide-up px-6 pb-6 text-sm leading-relaxed text-white/45">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </section>

          {/* ── CTA ── */}
          <section className="px-6 pb-24">
            <Reveal scale>
              <div
                className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-white/[0.14]"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 130% at 50% 115%, color-mix(in srgb, var(--accent-primary) 32%, transparent), transparent 60%), radial-gradient(ellipse 70% 100% at 50% -20%, rgba(124,58,237,0.3), transparent 55%), rgba(255,255,255,0.02)",
                }}
              >
                <Sparkles />
                <div className="relative z-[2] mx-auto max-w-xl px-8 py-20 text-center">
                  <h2 className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    The board is <span className="gradient-flow-text">waiting.</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-sm text-white/45">
                    An opponent is already queued. Your next brilliant move starts here.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <ShimmerLink href="/chess">♟ Play now — it&apos;s free</ShimmerLink>
                    <Link
                      href="/analyser/document"
                      className="rounded-2xl border border-white/[0.15] bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
                    >
                      📄 Analyse a document
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-white/[0.06] px-6 py-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-white/20">© 2026 lanky.lol — crafted with obsession.</p>
            <div className="flex gap-6 text-xs font-medium text-white/25">
              <Link href="/chess" className="transition-colors hover:text-white/60">Chess</Link>
              <Link href="/analyser/image" className="transition-colors hover:text-white/60">Vision</Link>
              <Link href="/analyser/document" className="transition-colors hover:text-white/60">Documents</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
