"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { soundManager } from "@/lib/audio";

type SiteHeaderProps = {
  title?: string;
};

export function SiteHeader({ title }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return typeof window !== "undefined" ? soundManager.isMuted() : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleAudio = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/analyser/image", label: "Image AI" },
    { href: "/analyser/document", label: "Doc AI" },
    { href: "/games", label: "Games Arcade" },
  ];

  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-cyan-500/20 bg-[#030712]/90 px-4 py-3 backdrop-blur-xl sm:px-8">
      {/* Brand & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 transition-all hover:border-cyan-400/60 hover:bg-cyan-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-black text-cyan-300 group-hover:scale-105 transition-transform">
            L
          </span>
          <span className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-wide text-cyan-100">
            lanky.lol
          </span>
        </Link>

        {title && (
          <>
            <span className="h-4 w-px bg-cyan-500/20 hidden sm:block" aria-hidden />
            <h1 className="hidden sm:block truncate text-sm font-medium text-slate-300">
              {title}
            </h1>
          </>
        )}
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 rounded-full border border-cyan-500/15 bg-slate-950/60 p-1.5 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                  : "text-slate-400 hover:text-cyan-200 hover:bg-cyan-950/40"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions: Audio Toggle & Mobile Menu */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAudio}
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/70 text-sm text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle mobile menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/70 text-slate-300 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 border-b border-cyan-500/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl md:hidden animate-slide-up">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-200"
                      : "text-slate-300 hover:bg-slate-900/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
