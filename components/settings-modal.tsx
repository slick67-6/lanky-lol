"use client";

import { useTheme, ACCENT_PALETTES, AccentColor, BackgroundStyle, AppearanceMode, UiDensity, FontFamily } from "@/lib/theme-context";
import { useState } from "react";
import { useToast } from "@/components/toast";

export function SettingsModal() {
  const { settings, updateSettings, resetToDefaults, exportSettings, importSettings, isSettingsOpen, setIsSettingsOpen } = useTheme();
  const { showToast } = useToast();
  const [importString, setImportString] = useState("");
  const [showImport, setShowImport] = useState(false);

  if (!isSettingsOpen) return null;

  const handleExport = () => {
    const json = exportSettings();
    navigator.clipboard.writeText(json);
    showToast("Settings JSON copied to clipboard!", "success");
  };

  const handleImportSubmit = () => {
    const success = importSettings(importString);
    if (success) {
      showToast("Settings imported successfully!", "success");
      setShowImport(false);
      setImportString("");
    } else {
      showToast("Invalid JSON settings format.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="flex h-full w-full max-w-md flex-col border-l border-cyan-500/20 bg-slate-950 p-6 text-slate-100 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-bold text-cyan-100">Preferences & Customization</h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 text-slate-400 hover:text-cyan-300"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Appearance Mode */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Appearance Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["dark", "amoled", "light", "auto"] as AppearanceMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ appearance: mode })}
                  className={`rounded-xl border py-2 text-xs font-bold uppercase transition-all ${
                    settings.appearance === mode
                      ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Accent Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACCENT_PALETTES) as AccentColor[]).map((key) => {
                const palette = ACCENT_PALETTES[key as keyof typeof ACCENT_PALETTES];
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ accentColor: key })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      settings.accentColor === key
                        ? "border-cyan-400 bg-cyan-950/60 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.hex }} />
                    <span className="capitalize">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Style */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Background Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["particles", "grid", "aurora", "gradient", "minimal"] as BackgroundStyle[]).map((bg) => (
                <button
                  key={bg}
                  onClick={() => updateSettings({ backgroundStyle: bg })}
                  className={`rounded-xl border py-2 text-xs font-semibold uppercase transition-all ${
                    settings.backgroundStyle === bg
                      ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Font Family
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["inter", "geist", "syne"] as FontFamily[]).map((f) => (
                <button
                  key={f}
                  onClick={() => updateSettings({ fontFamily: f })}
                  className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                    settings.fontFamily === f
                      ? "border-cyan-400 bg-cyan-950/60 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* UI Density */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              UI Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["compact", "comfortable", "spacious"] as UiDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => updateSettings({ uiDensity: d })}
                  className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                    settings.uiDensity === d
                      ? "border-cyan-400 bg-cyan-950/60 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Sliders */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300">
              🔊 Audio Settings
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>SFX Volume</span>
                  <span>{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-300">Enable Sound Effects</span>
                <button
                  onClick={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    settings.soundEffectsEnabled ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {settings.soundEffectsEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Import / Export / Reset Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-950/40 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50"
              >
                Export Settings
              </button>
              <button
                onClick={() => setShowImport(!showImport)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Import Settings
              </button>
            </div>

            {showImport && (
              <div className="flex flex-col gap-2 pt-2">
                <textarea
                  value={importString}
                  onChange={(e) => setImportString(e.target.value)}
                  placeholder="Paste JSON settings string here..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  rows={3}
                />
                <button
                  onClick={handleImportSubmit}
                  className="rounded-xl bg-cyan-500 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Apply Imported Settings
                </button>
              </div>
            )}

            <button
              onClick={() => {
                resetToDefaults();
                showToast("Settings reset to defaults.", "info");
              }}
              className="mt-2 rounded-xl border border-rose-500/30 bg-rose-950/20 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-900/40"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
