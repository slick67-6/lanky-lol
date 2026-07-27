"use client";

import { useTheme, ACCENT_PALETTES, AccentColor, AppearanceMode } from "@/lib/theme-context";
import { useEffect, useRef } from "react";

function X() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}
function Toggle({ on, onChange, accent }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-all duration-200"
      style={{ background: on ? (accent || "var(--accent-primary)") : "rgba(255,255,255,0.15)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200"
        style={{ left: on ? "calc(100% - 1.375rem)" : "0.125rem" }}
      />
    </button>
  );
}

export function SettingsModal() {
  const { settings, updateSettings, resetToDefaults, isSettingsOpen, setIsSettingsOpen } = useTheme();
  const volRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsSettingsOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const APPEARANCES: { id: AppearanceMode; label: string; preview: string }[] = [
    { id: "dark",   label: "Dark",   preview: "#030712" },
    { id: "amoled", label: "AMOLED", preview: "#000000" },
    { id: "auto",   label: "Auto",   preview: "#111827" },
  ];

  const ACCENT_KEYS = Object.keys(ACCENT_PALETTES) as AccentColor[];
  const accentHex = settings.accentColor !== "custom"
    ? ACCENT_PALETTES[settings.accentColor as keyof typeof ACCENT_PALETTES]?.hex
    : settings.customAccentHex;

  return (
    <>
      {/* Backdrop — intentionally very light so dark pages aren't swallowed */}
      <div
        className="fixed inset-0 z-[199] backdrop-blur-[2px]"
        style={{ background: "rgba(0,0,0,0.22)" }}
        onClick={() => setIsSettingsOpen(false)}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label="Preferences"
        className="fixed right-0 top-0 bottom-0 z-[200] flex w-full max-w-[300px] flex-col border-l border-white/[0.08] bg-[#0d0d0f] shadow-2xl"
        style={{ animation: "panel-in 0.22s cubic-bezier(.16,1,.3,1) forwards" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--accent-primary)", boxShadow: `0 0 8px var(--accent-primary)` }}
            />
            <h2 className="text-sm font-semibold text-white/80">Preferences</h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close preferences"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          >
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* ── Appearance ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Appearance</p>
            <div className="grid grid-cols-3 gap-1.5">
              {APPEARANCES.map(({ id, label, preview }) => {
                const isActive = settings.appearance === id;
                return (
                  <button
                    key={id}
                    onClick={() => updateSettings({ appearance: id })}
                    className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-[0.62rem] font-semibold transition-all"
                    style={{
                      borderColor: isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                      background:  isActive ? `rgba(var(--accent-primary-rgb, 34,211,238), 0.1)` : "rgba(255,255,255,0.03)",
                      color:       isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-white/10"
                      style={{ background: preview }}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Accent colour ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Accent colour</p>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_KEYS.map((key) => {
                const p        = ACCENT_PALETTES[key as keyof typeof ACCENT_PALETTES];
                const isActive = settings.accentColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ accentColor: key })}
                    title={p.label}
                    aria-label={p.label}
                    className="relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150"
                    style={{
                      backgroundColor: p.hex,
                      transform:  isActive ? "scale(1.18)" : "scale(1)",
                      boxShadow:  isActive ? `0 0 0 2px #0d0d0f, 0 0 0 4px ${p.hex}` : "none",
                    }}
                  >
                    {isActive && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {/* Custom hex input */}
              <label
                className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 transition-all hover:border-white/40"
                title="Custom colour"
                style={{
                  background: settings.accentColor === "custom" ? settings.customAccentHex : "transparent",
                  boxShadow: settings.accentColor === "custom" ? `0 0 0 2px #0d0d0f, 0 0 0 4px ${settings.customAccentHex}` : "none",
                  transform:  settings.accentColor === "custom" ? "scale(1.18)" : "scale(1)",
                }}
              >
                <span className="text-[0.7rem] text-white/50">{settings.accentColor === "custom" ? "" : "+"}</span>
                <input
                  type="color"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  value={settings.customAccentHex}
                  onChange={(e) => updateSettings({ accentColor: "custom", customAccentHex: e.target.value })}
                />
              </label>
            </div>
            <p className="mt-2 text-[0.6rem] text-white/25">
              Selected: <span style={{ color: accentHex }}>{accentHex}</span>
            </p>
          </section>

          {/* ── Sound ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Sound</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <span className="text-xs text-white/60">Sound effects</span>
                <Toggle
                  on={settings.soundEffectsEnabled}
                  onChange={(v) => updateSettings({ soundEffectsEnabled: v })}
                />
              </div>
              {settings.soundEffectsEnabled && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-white/60">Volume</span>
                    <span className="text-[0.65rem] text-white/35">{Math.round(settings.soundVolume * 100)}%</span>
                  </div>
                  <input
                    ref={volRef}
                    type="range"
                    min={0} max={1} step={0.05}
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-slider"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ── Particles ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Background</p>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <span className="text-xs text-white/60">Particle effects</span>
              <Toggle
                on={settings.particleEffectsEnabled}
                onChange={(v) => updateSettings({ particleEffectsEnabled: v })}
              />
            </div>
          </section>

          {/* ── Chess ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Chess</p>
            <div className="space-y-2">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/60">Piece slide animations</span>
                    <p className="mt-0.5 text-[0.6rem] text-white/25">Smooth glide when pieces move</p>
                  </div>
                  <Toggle
                    on={settings.chessAnimations}
                    onChange={(v) => updateSettings({ chessAnimations: v })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Motion ── */}
          <section>
            <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/25">Motion</p>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <span className="text-xs text-white/60">Reduce motion</span>
              <Toggle
                on={settings.reducedMotion}
                onChange={(v) => updateSettings({ reducedMotion: v })}
              />
            </div>
          </section>


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
          from { transform: translateX(100%); opacity: 0.7; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
}
