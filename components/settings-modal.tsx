"use client";

import { useTheme, ACCENT_PALETTES, AccentColor, AppearanceMode } from "@/lib/theme-context";
import { useEffect } from "react";

function X() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SettingsModal() {
  const { settings, updateSettings, resetToDefaults, isSettingsOpen, setIsSettingsOpen } = useTheme();

  // Close on Escape
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsSettingsOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const APPEARANCES: { id: AppearanceMode; label: string; icon: string }[] = [
    { id: "dark",   label: "Dark",   icon: "🌙" },
    { id: "amoled", label: "AMOLED", icon: "⬛" },
    { id: "light",  label: "Light",  icon: "☀️"  },
    { id: "auto",   label: "Auto",   icon: "🔄" },
  ];

  const ACCENT_KEYS = Object.keys(ACCENT_PALETTES) as AccentColor[];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm"
        onClick={() => setIsSettingsOpen(false)}
        aria-hidden
      />

      {/* Panel — slides in from right */}
      <div
        role="dialog"
        aria-modal
        aria-label="Preferences"
        className="fixed right-0 top-0 bottom-0 z-[200] flex w-full max-w-xs flex-col border-l border-white/[0.07] bg-[#0e0e0e] shadow-2xl"
        style={{ animation: "panel-in 0.22s cubic-bezier(.16,1,.3,1) forwards" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-white/80">Preferences</h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close preferences"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          >
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Theme */}
          <div>
            <p className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/25">Theme</p>
            <div className="grid grid-cols-4 gap-1.5">
              {APPEARANCES.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => updateSettings({ appearance: id })}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[0.65rem] font-semibold transition-all ${
                    settings.appearance === id
                      ? "border-white/30 bg-white/[0.1] text-white"
                      : "border-white/[0.06] bg-white/[0.03] text-white/40 hover:border-white/15 hover:text-white/70"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <p className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/25">Accent colour</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_KEYS.map((key) => {
                const p = ACCENT_PALETTES[key as keyof typeof ACCENT_PALETTES];
                const isActive = settings.accentColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ accentColor: key })}
                    title={p.label}
                    aria-label={p.label}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      isActive ? "border-white scale-110" : "border-transparent hover:border-white/30 hover:scale-105"
                    }`}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
            </div>
          </div>

          {/* Sound */}
          <div>
            <p className="mb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/25">Sound effects</p>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-white/60">Enable sounds</span>
              <button
                onClick={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
                className={`relative h-6 w-10 rounded-full transition-all duration-200 ${
                  settings.soundEffectsEnabled ? "bg-white" : "bg-white/20"
                }`}
                aria-checked={settings.soundEffectsEnabled}
                role="switch"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0e0e0e] shadow transition-all duration-200 ${
                    settings.soundEffectsEnabled ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.07] px-5 py-4">
          <button
            onClick={resetToDefaults}
            className="w-full rounded-xl border border-white/[0.07] py-2.5 text-xs font-semibold text-white/30 transition-colors hover:border-white/15 hover:text-white/60"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      <style>{`
        @keyframes panel-in {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
