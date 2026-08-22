"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ParticlesBackground } from "@/components/particles-background";
import { ScrollProgress } from "@/components/fx/background-fx";
import { FlipWords, Marquee, NumberTicker, Reveal } from "@/components/fx/motion";
import { BorderBeamCard, Sparkles } from "@/components/fx/effects";

const CAPABILITIES = [
  ["♟️", "Instant chess matchmaking"],
  ["ðŸ“„", "PDF · DOCX · PPTX · XLSX"],
  ["💬", "Chat with your documents"],
  ["🧠", "Auto notes & quizzes"],
  ["🖼️", "Image & screenshot analysis"],
  ["🔒", "Zero accounts"],
  ["🎨", "Custom themes"],
  ["⌨️", "⌘K everywhere"],
];

const STATS = [
  { to: 24, suffix: "/7", label: "Opponents online" },
  { to: 1.8, decimals: 1, suffix: "s", label: "Avg. pairing time" },
  { to: 4, suffix: "", label: "Study modes per doc" },
  { to: 100, suffix: "%", label: "Free forever" },
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

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="mb-14 text-center">
      <span
        className="mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.24em]"
        style={{
          borderColor: "color-mix(in srgb, var(--accent-primary) 35%, transparent)",
          color: "var(--accent-primary)",
          background: "color-mix(in srgb, var(--accent-primary) 9%, transparent)",
        }}
      >
        {eyebrow}
      </span>
      <h2 className="text-[1.9rem] font-bold leading-[1.3] tracking-normal text-white sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-4 max-w-lg leading-relaxed text-white/40">{sub}</p>}
    </Reveal>
  );
}

function PairingLog() {
  const rows = [
    { label: "search.pool.join()", detail: "queued · elo ±120" },
    { label: "opponent.found", detail: "1.8s · guest-2841" },
    { label: "game.start", detail: "5+0 rapid · white" },
  ];
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 font-mono text-xs leading-loose sm:text-[12.5px]">
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
            background: "linear-gradient(90deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 55%, white))",
            animation: "load-slide 2.4s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

function ChatDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 700),
      window.setTimeout(() => setStage(2), 1900),
      window.setTimeout(() => setStage(3), 3100),
      window.setTimeout(() => setStage(4), 4300),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const bubble = (show: boolean) =>
    `chat-demo-bubble max-w-[85%] rounded-2xl border px-4 py-2.5 text-left text-[13px] leading-relaxed transition-all duration-500 ${
      show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
    }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-black/40">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-semibold text-white/45">thesis.pdf — Chat tab</span>
        <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/30">4 / 24 pages read</span>
      </div>
      <div className="flex min-h-[190px] flex-col justify-end gap-2.5 p-4">
        <div className={bubble(stage >= 1) + " self-end bg-white/[0.07] text-white/80"}>
          Summarise chapter 3 and quiz me on it.
        </div>
        {stage >= 2 && stage < 4 ? (
          <div className={bubble(true) + " self-start"} style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)" }}>
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        ) : null}
        <div
          className={bubble(stage >= 4) + " self-start"}
          style={{
            background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
          }}
        >
          Chapter 3 argues that distributed teams outperform co-located ones after year one.
          <span className="mt-1 block text-white/60">Ready for your quiz — 5 questions?</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip text-slate-100 selection:bg-white/20" style={{ background: "var(--bg)" }}>
      <ScrollProgress />
      <ParticlesBackground />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">

          {/* â”€â”€ 1 · Hero â”€â”€ */}
          <section className="relative flex flex-col items-center overflow-hidden px-6 pb-20 pt-24 text-center">
                        <div className="relative z-[3] mx-auto max-w-3xl">
              <div className="animate-slide-up anim-delay-0 mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/[0.14] bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-white/55 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online chess matchmaking is live
              </div>

              <h1 className="animate-slide-up anim-delay-1 mb-6 text-[2.6rem] font-extrabold leading-[1.28] tracking-normal text-white sm:text-6xl lg:text-[4.4rem]">
                Play chess.
                <br />
                Study smarter.
                <br />
                No account — just <FlipWords />
              </h1>

              <p className="animate-slide-up anim-delay-2 mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/45 sm:text-lg">
                lanky.lol does two things properly: pairs you with a real chess opponent in seconds,
                and turns your documents into notes, quizzes and conversations with AI.
              </p>

              <div className="animate-slide-up anim-delay-3 mb-10 flex flex-wrap items-center justify-center gap-3">
                <ShimmerLink href="/chess">
                  ♟ Play chess
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </ShimmerLink>
                <Link
                  href="/analyser/document"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.15] bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09] hover:text-white"
                >
                  💬 Open AI analyser
                </Link>
              </div>

              <p className="animate-slide-up anim-delay-4 text-xs font-medium tracking-wide text-white/25">
                No downloads · No sign-up · No ads
              </p>
            </div>

            <Reveal delay={150} scale className="relative z-[3] mt-16 grid w-full max-w-4xl gap-4 md:grid-cols-2">
              <BorderBeamCard className="rounded-3xl">
                <div className="overflow-hidden rounded-3xl border border-white/[0.12] shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl" style={{ background: "linear-gradient(160deg, rgba(18,22,40,0.85), rgba(8,10,22,0.88))" }}>
                  <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3">
                    ♟ <span className="text-sm font-bold text-white">Lanky Chess</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-black tracking-[0.14em] text-emerald-300">
                      LIVE
                    </span>
                  </div>
                  <div className="p-5 text-left">
                    <PairingLog />
                    <p className="mt-4 text-xs leading-relaxed text-white/35">
                      Click Find a Match → paired automatically. 1, 5 or 10 minute clocks, instant rematch.
                    </p>
                    <Link href="/chess" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:brightness-125" style={{ color: "var(--accent-primary)" }}>
                      Find a match now →
                    </Link>
                  </div>
                </div>
              </BorderBeamCard>

              <div className="group overflow-hidden rounded-3xl border border-white/[0.12] shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all hover:-translate-y-1 hover:border-white/[0.22]" style={{ background: "linear-gradient(160deg, rgba(18,22,40,0.85), rgba(8,10,22,0.88))" }}>
                <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3">
                  ðŸ“„ <span className="text-sm font-bold text-white">AI Analyser Suite</span>
                  <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/35">⌘K</span>
                </div>
                <div className="p-5 text-left">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {["Key notes", "Answers", "Quiz", "Chat"].map((t, i) => (
                      <span
                        key={t}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${i === 3 ? "text-[#030712]" : "border border-white/[0.12] text-white/50"}`}
                        style={i === 3 ? { background: "var(--accent-primary)" } : {}}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ChatDemo />
                  <Link href="/analyser/document" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:brightness-125" style={{ color: "var(--accent-primary)" }}>
                    Upload a document →
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>

          {/* â”€â”€ 2 · Capability marquee â”€â”€ */}
          <section className="border-y border-white/[0.07] bg-white/[0.015] py-9">
            <Marquee>
              {CAPABILITIES.map(([icon, label]) => (
                <span
                  key={label}
                  className="whitespace-nowrap rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-base font-semibold text-white/45 transition-colors hover:border-white/25 hover:text-white/90"
                >
                  {icon} {label}
                </span>
              ))}
            </Marquee>
          </section>

          {/* â”€â”€ 3 · How it works â”€â”€ */}
          <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24">
            <SectionHead
              eyebrow="HOW IT WORKS"
              title={<>Two lanes.<br /><span className="gradient-flow-text">Zero friction in either.</span></>}
              sub="No sign-ups anywhere. Pick a lane and you're already halfway done."
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal scale>
                <div className="h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-8 backdrop-blur-xl">
                  <h3 className="mb-6 text-lg font-bold text-white">♟ The chess lane</h3>
                  <ol className="space-y-5">
                    {[
                      ["Pick a clock", "1, 5 or 10 minutes per side."],
                      ["Hit Find a Match", "The pool pairs you with a real opponent in ~2 seconds."],
                      ["Play & rematch", "Atomic move sync at 60fps, instant rematch when it's over."],
                    ].map(([t, d], i) => (
                      <li key={t} className="flex gap-4">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 40%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 10%, transparent)" }}>
                          {i + 1}
                        </span>
                        <span>
                          <strong className="block text-sm font-bold text-white/90">{t}</strong>
                          <span className="text-sm text-white/40">{d}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>

              <Reveal scale delay={100}>
                <div className="h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-8 backdrop-blur-xl">
                  <h3 className="mb-6 text-lg font-bold text-white">💬 The study lane</h3>
                  <ol className="space-y-5">
                    {[
                      ["Drop a file", "PDF, DOCX, PPTX or XLSX — or an image for vision analysis."],
                      ["Get the study pack", "Key notes, worked answers and a quiz generated instantly."],
                      ["Ask anything", "The Chat tab answers from the actual document — formulas included."],
                    ].map(([t, d], i) => (
                      <li key={t} className="flex gap-4">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold" style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 40%, transparent)", color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 10%, transparent)" }}>
                          {i + 1}
                        </span>
                        <span>
                          <strong className="block text-sm font-bold text-white/90">{t}</strong>
                          <span className="text-sm text-white/40">{d}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            </div>
          </section>

          {/* â”€â”€ 4 · Stats â”€â”€ */}
          <section className="mx-auto w-full max-w-5xl px-6 pb-24">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} scale delay={i * 80}>
                  <div className="rounded-[24px] border border-white/[0.09] bg-white/[0.03] p-7 text-center transition-all hover:-translate-y-1.5 hover:border-white/[0.2]">
                    <div className="text-4xl font-extrabold tracking-normal gradient-flow-text">
                      <NumberTicker to={s.to} decimals={s.decimals} suffix={s.suffix} />
                    </div>
                    <div className="mt-2 text-xs font-medium text-white/30">{s.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* â”€â”€ 5 · Feature bento â”€â”€ */}
          <section className="mx-auto w-full max-w-6xl px-6 pb-24">
            <SectionHead
              eyebrow="UNDER THE HOOD"
              title={<>Small details,<br /><span className="gradient-flow-text">everywhere.</span></>}
              sub="The polish isn't just on the surface — it's baked into how every interaction feels."
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Reveal scale className="md:col-span-2">
                <div className="group h-full rounded-[28px] border border-white/[0.1] bg-white/[0.04] p-8 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.06]">
                  <div className="mb-5 flex h-fit w-fit items-center justify-center rounded-2xl p-3.5 text-3xl" style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", boxShadow: "0 0 24px color-mix(in srgb, var(--accent-primary) 25%, transparent)" }}>
                    ♟
                  </div>
                  <h3 className="text-xl font-bold text-white">Full rules engine</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">
                    Check, checkmate, stalemate, en-passant, castling and promotion — all enforced server-side with 1/5/10 minute clocks.
                  </p>
                </div>
              </Reveal>

              <Reveal scale delay={90}>
                <div className="group h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.055]">
                  <div className="mb-5 inline-flex rounded-2xl bg-cyan-400/10 p-3.5 text-2xl shadow-[0_0_22px_color-mix(in_srgb,var(--accent-primary)_20%,transparent)]">🖼️</div>
                  <h3 className="text-xl font-bold text-white">Vision Analyser</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Screenshots, diagrams, handwriting — analysed in seconds.
                  </p>
                </div>
              </Reveal>

              <Reveal scale delay={140}>
                <div className="group h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-7 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.055]">
                  <div className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-black/40 px-3 py-1.5 font-mono text-xs text-white/60">
                    ⌘ K
                  </div>
                  <h3 className="text-xl font-bold text-white">Command palette</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    Every corner of the site is one keystroke away.
                  </p>
                </div>
              </Reveal>

              <Reveal scale delay={190} className="md:col-span-2">
                <div className="h-full rounded-[28px] border border-white/[0.1] bg-white/[0.035] p-8 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:border-white/[0.2] hover:bg-white/[0.05]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-sm">
                      <div className="mb-5 inline-flex rounded-2xl bg-white/[0.06] p-3.5 text-2xl">🎨</div>
                      <h3 className="text-xl font-bold text-white">Make it yours</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/40">
                        Accent palettes, AMOLED black, true light mode — the entire interface bends to your taste, saved locally.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {["#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"].map((c) => (
                        <span key={c} className="h-16 w-8 rounded-lg border border-white/[0.15]" style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* â”€â”€ 6 · CTA â”€â”€ */}
          <section className="px-6 pb-24">
            <Reveal scale>
              <div
                className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-white/[0.14]"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 130% at 50% 115%, color-mix(in srgb, var(--accent-primary) 32%, transparent), transparent 60%), radial-gradient(ellipse 70% 100% at 50% -20%, color-mix(in srgb, var(--accent-primary) 16%, transparent), transparent 55%), rgba(255,255,255,0.02)",
                }}
              >
                <Sparkles />
                <div className="relative z-[2] mx-auto max-w-xl px-8 py-20 text-center">
                  <h2 className="text-[1.9rem] font-bold leading-[1.3] tracking-normal text-white sm:text-4xl">
                    An opponent is queued.<br /><span className="gradient-flow-text">Your move.</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-sm text-white/45">
                    Free forever, no card, no account. Bring a document if you want.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <ShimmerLink href="/chess">♟ Play now</ShimmerLink>
                    <Link
                      href="/analyser/image"
                      className="rounded-2xl border border-white/[0.15] bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
                    >
                      🖼️ Analyse an image
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
