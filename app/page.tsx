import { FadeIn } from "@/components/fade-in";
import { LanksterGalleryAnnouncement } from "@/components/lankster-gallery-announcement";
import { LanksterGalleryGate } from "@/components/lankster-gallery-gate";
import { ParticlesBackground } from "@/components/particles-background";
import { ScrollArrow } from "@/components/scroll-arrow";
import { ToolCard } from "@/components/tool-card";
import Image from "next/image";
import { WordReveal } from "@/components/word-reveal";

const SHOW_HERO_IMAGE = true;


function ImageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M3 16l5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h8l4 4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M16 4v4h4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-dvh w-full bg-[#030712] text-slate-100">
      <ParticlesBackground />
      <LanksterGalleryAnnouncement />
      <LanksterGalleryGate />

      <main className="relative z-10">
        {/* Hero */}
        <section className="scroll-snap-section flex min-h-dvh w-full flex-col items-center justify-center px-6 pb-16 pt-12 text-center snap-start">
          <FadeIn delay={1200}>
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.35em] text-cyan-500/90">
              lanky.lol
            </p>
          </FadeIn>
          <WordReveal text="Tool for the fools" wordDelay={280} />
          <FadeIn delay={1400}>
            <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
              The lankiest and most jankiest tools brought to you by the
              langster gangster, now smoother on desktop and mobile.
            </p>
          </FadeIn>
          <FadeIn delay={1600}>
            <ScrollArrow />
          </FadeIn>
          {SHOW_HERO_IMAGE && (
            <FadeIn delay={1800}>
              <div className="mx-auto mt-8 w-full max-w-[min(88vw,28rem)] overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/50 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.45)]">
                <Image
                  src="/langster-gangster.png"
                  alt="Langster gangster at a futuristic workstation"
                  width={820}
                  height={1280}
                  priority
                  className="h-auto max-h-[34dvh] w-full object-contain object-center sm:max-h-[42dvh]"
                />
              </div>
            </FadeIn>
          )}

        </section>

        {/* Tools */}
        <section className="scroll-snap-section flex min-h-dvh w-full flex-col items-center justify-center px-6 py-20 snap-start">
          <FadeIn>
            <h2 className="overflow-visible py-1 font-[family-name:var(--font-syne)] text-center text-2xl font-semibold leading-[1.45] text-cyan-100/90 sm:text-3xl">
              Pick your tool
            </h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-slate-500 sm:text-base">
              Two analysers. One working. One in development.
            </p>
          </FadeIn>

          <div className="mt-14 flex w-full max-w-4xl flex-col items-center justify-center gap-8 md:flex-row md:gap-10">
            <FadeIn delay={120} className="flex w-full justify-center">
              <ToolCard
                href="/analyser/image"
                title="AI Image Analyser"
                description="Upload or paste any image, ask questions, get real vision-powered answers."
                icon={<ImageIcon />}
                badge="Live"
              />
            </FadeIn>
            <FadeIn delay={200} className="flex w-full justify-center">
              <ToolCard
                href="/analyser/document"
                title="AI Document Analyser"
                description="PDFs, docs, and walls of text — a dedicated UI is on the way. Peek inside for the roadmap."
                icon={<DocumentIcon />}
                badge="Soon"
              />
            </FadeIn>
          </div>
        </section>
      </main>
    </div>
  );
}
