"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { soundManager } from "@/lib/audio";

export type AppearanceMode = "dark" | "light" | "amoled" | "auto";
export type AccentColor = "cyan" | "purple" | "emerald" | "amber" | "rose" | "indigo" | "crimson" | "custom";
export type BackgroundStyle = "particles" | "grid" | "aurora" | "gradient" | "minimal";
export type UiDensity = "compact" | "comfortable" | "spacious";
export type GlassBlur = "none" | "subtle" | "medium" | "heavy";
export type AnimationSpeed = "slow" | "normal" | "fast" | "none";
export type FontFamily = "inter" | "geist" | "syne";

export interface ThemeSettings {
  appearance: AppearanceMode;
  accentColor: AccentColor;
  customAccentHex: string;
  backgroundStyle: BackgroundStyle;
  uiDensity: UiDensity;
  glassBlur: GlassBlur;
  animationSpeed: AnimationSpeed;
  fontFamily: FontFamily;
  soundVolume: number;
  musicVolume: number;
  soundEffectsEnabled: boolean;
  particleEffectsEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  appearance: "dark",
  accentColor: "cyan",
  customAccentHex: "#22d3ee",
  backgroundStyle: "particles",
  uiDensity: "comfortable",
  glassBlur: "medium",
  animationSpeed: "normal",
  fontFamily: "inter",
  soundVolume: 0.8,
  musicVolume: 0.5,
  soundEffectsEnabled: true,
  particleEffectsEnabled: true,
  reducedMotion: false,
  highContrast: false,
};

const STORAGE_KEY = "lanky_theme_settings_2026";

export const ACCENT_PALETTES: Record<Exclude<AccentColor, "custom">, { hex: string; rgb: string; label: string }> = {
  cyan: { hex: "#22d3ee", rgb: "34, 211, 238", label: "Cyan Cyber" },
  purple: { hex: "#a855f7", rgb: "168, 85, 247", label: "Neon Purple" },
  emerald: { hex: "#34d399", rgb: "52, 211, 153", label: "Emerald Glow" },
  amber: { hex: "#fbbf24", rgb: "251, 191, 36", label: "Solar Amber" },
  rose: { hex: "#f43f5e", rgb: "244, 63, 94", label: "Rose Crimson" },
  indigo: { hex: "#6366f1", rgb: "99, 102, 241", label: "Indigo Quantum" },
  crimson: { hex: "#dc2626", rgb: "220, 38, 38", label: "Laser Crimson" },
};

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (partial: Partial<ThemeSettings>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const applyDomTheme = useCallback((s: ThemeSettings) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Appearance mode classes
    root.classList.remove("theme-dark", "theme-light", "theme-amoled");
    if (s.appearance === "amoled") {
      root.classList.add("dark", "theme-amoled");
      root.style.backgroundColor = "#000000";
    } else if (s.appearance === "light") {
      root.classList.remove("dark");
      root.classList.add("theme-light");
      root.style.backgroundColor = "#f8fafc";
    } else if (s.appearance === "dark") {
      root.classList.add("dark", "theme-dark");
      root.style.backgroundColor = "#030712";
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark", "theme-dark");
        root.style.backgroundColor = "#030712";
      } else {
        root.classList.remove("dark");
        root.classList.add("theme-light");
        root.style.backgroundColor = "#f8fafc";
      }
    }

    // Accent Colors
    let accentHex = s.customAccentHex || "#22d3ee";
    if (s.accentColor !== "custom") {
      accentHex = ACCENT_PALETTES[s.accentColor]?.hex || "#22d3ee";
    }
    root.style.setProperty("--accent-primary", accentHex);

    // Audio volume sync
    if (s.soundEffectsEnabled) {
      soundManager.setMuted(false);
      soundManager.setVolume(s.soundVolume);
    } else {
      soundManager.setMuted(true);
    }
  }, []);

  useEffect(() => {
    applyDomTheme(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, applyDomTheme]);

  const updateSettings = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      setSettings((prev) => ({ ...prev, ...parsed }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        settings,
        updateSettings,
        resetToDefaults,
        exportSettings,
        importSettings,
        isSettingsOpen,
        setIsSettingsOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
