"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { soundManager } from "@/lib/audio";
import { useTheme } from "@/lib/theme-context";

type SiteHeaderProps = {
  title?: string;
};

// Inline SVG icons — no external dep
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconVolume({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SiteHeader({ title }: SiteHeaderProps) {
  const pathname = usePathname();
  const { setIsSettingsOpen, setIsCommandPaletteOpen } = useTheme();
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
    { href: "/chess", label: "Chess" },
    { href: "/games", label: "Arcade" },
    { href: "/analyser/image", label: "Tools" },
  ];

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.07] bg-[#030712]/90 backdrop-blur-xl">
      {/* 3-column grid — guarantees nav is always pixel-perfect centered */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5 sm:px-6">

        {/* ── Left: Brand ── */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-all hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/10 text-[0.7rem] font-black text-white">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight text-white/80 group-hover:text-white transition-colors">
              lanky.lol
            </span>
          </Link>
          {title && (
            <>
              <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
              <h1 className="hidden truncate text-xs font-medium text-white/40 sm:block">
                {title}
              </h1>
            </>
          )}
        </div>

        {/* ── Center: Nav pill ── */}
        <nav
          className="hidden md:flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#030712] shadow-sm"
                    : "text-white/50 hover:text-white/90 hover:bg-white/[0.07]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Actions (pushed to right) ── */}
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Open command palette (⌘K)"
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white/40 transition-all hover:border-white/20 hover:text-white/80"
          >
            <IconSearch />
            <span className="font-medium">Search</span>
            <kbd className="rounded bg-white/10 px-1 py-0.5 text-[0.6rem] font-bold text-white/30">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Customisation settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/40 transition-all hover:border-white/20 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <IconSettings />
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/40 transition-all hover:border-white/20 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <IconVolume muted={isMuted} />
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle mobile menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/40 transition-all hover:text-white/80 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.07] bg-[#030712]/98 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white/10 text-white border border-white/15"
                      : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex gap-2 border-t border-white/[0.06] pt-2">
              <button
                onClick={() => { setIsCommandPaletteOpen(true); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-white/50"
              >
                <IconSearch /> Search
              </button>
              <button
                onClick={() => { setIsSettingsOpen(true); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-medium text-white/50"
              >
                <IconSettings /> Settings
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
