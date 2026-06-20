import Link from "next/link";

export function GamesBackLink() {
  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-6">
      <Link
        href="/games"
        className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-950/40"
      >
        ← Back to games
      </Link>
    </div>
  );
}
