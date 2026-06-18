"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ToolCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
};

export function ToolCard({
  href,
  title,
  description,
  icon,
  badge,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      prefetch
      className="group relative block w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-8 backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:border-cyan-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-[0.98] md:max-w-lg"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full border border-cyan-500/30 bg-cyan-950/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
          {badge}
        </span>
      )}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-950/50 text-cyan-300 transition-colors group-hover:border-cyan-400/60 group-hover:text-cyan-200">
        {icon}
      </div>
      <h2 className="syne-text-safe font-[family-name:var(--font-syne)] text-2xl font-bold leading-[1.45] text-cyan-50 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
        {description}
      </p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition-transform group-hover:translate-x-1">
        Open
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
