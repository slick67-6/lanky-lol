import { FadeIn } from "@/components/fade-in";
import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";

export default function DocumentAnalyserPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="AI Document Analyser" />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <FadeIn>
            <div className="mx-auto max-w-lg rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-10 backdrop-blur-md">
              <span className="inline-block rounded-full border border-amber-500/30 bg-amber-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                Coming soon
              </span>
              <h2 className="mt-6 font-[family-name:var(--font-syne)] text-2xl font-bold text-cyan-50 sm:text-3xl">
                Document analyser is in the lab
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                PDFs, Word docs, and long pastes will get their own UI here —
                same vibe as the image analyser. For now, try the image tool or
                head home.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/analyser/image"
                  prefetch
                  className="rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  Open Image Analyzer
                </Link>
                <Link
                  href="/"
                  prefetch
                  className="rounded-xl border border-cyan-500/30 px-6 py-3 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-950/40"
                >
                  Back home
                </Link>
              </div>
            </div>
          </FadeIn>
        </main>
      </div>
    </div>
  );
}
