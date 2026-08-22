"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/lib/theme-context";

type SiteHeaderProps = { title?: string };

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="8"  x2="20" y2="8"  />
      <line x1="4" y1="16" x2="20" y2="16" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SiteHeader({ title }: SiteHeaderProps) {
  const pathname = usePathname();
  const { setIsSettingsOpen } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/",       label: "Home"   },
    { href: "/chess",  label: "Chess"  },
    { href: "/analyser/image", label: "Tools"  },
  ];

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.07] bg-[#030712]/92 backdrop-blur-xl">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5 sm:px-6">

        {/* ── Left: Brand ── */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-2.5 py-1.5 transition-all hover:border-white/[0.18] hover:bg-white/[0.08]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.1] text-[0.7rem] font-black text-white">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight text-white/60 transition-colors group-hover:text-white/90">
              lanky.lol
            </span>
          </Link>
          {title && (
            <>
              <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
              <span className="hidden truncate text-xs text-white/30 sm:block">{title}</span>
            </>
          )}
        </div>

        {/* ── Center: Nav ── */}
        <nav
          className="hidden md:flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-1"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-white text-[#030712] shadow-sm"
                    : "text-white/45 hover:text-white/80 hover:bg-white/[0.07]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Actions ── */}
        <div className="flex items-center justify-end gap-1.5">
          {/* Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open preferences"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-white/40 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <IconSettings />
          </button>

          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-white/40 transition-all hover:border-white/[0.18] hover:text-white/80 md:hidden"
          >
            {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.06] bg-[#030712]/98 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-white/10 text-white border border-white/[0.12]"
                      : "text-white/45 hover:bg-white/[0.05] hover:text-white/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => { setIsSettingsOpen(true); setMobileMenuOpen(false); }}
              className="mt-1 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/40"
            >
              <IconSettings /> Preferences
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
