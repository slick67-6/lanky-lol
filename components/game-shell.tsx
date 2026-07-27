"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { soundManager } from "@/lib/audio";

interface GameShellProps {
  title: string;
  description: string;
  icon: string;
  score?: number;
  highScore?: number;
  scoreLabel?: string;
  highScoreLabel?: string;
  isPlaying?: boolean;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  howToPlayText?: string;
  customControls?: React.ReactNode;
  children: React.ReactNode;
  mobileControls?: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
    onAction?: () => void;
    actionLabel?: string;
  };
}

export function GameShell({
  title,
  description,
  icon,
  score,
  highScore,
  scoreLabel = "Score",
  highScoreLabel = "High Score",
  isPlaying = false,
  isPaused = false,
  onPauseToggle,
  howToPlayText,
  customControls,
  children,
  mobileControls,
}: GameShellProps) {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.isMuted());
  const [volume, setVolume] = useState<number>(() => soundManager.getVolume());
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleMuteToggle = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundManager.setVolume(val);
    if (val > 0 && isMuted) {
      soundManager.setMuted(false);
      setIsMuted(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100 selection:bg-cyan-500/30">
      <ParticlesBackground />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title={title} />

        {/* Sub-Header Bar */}
        <div className="border-b border-cyan-500/15 bg-slate-950/60 backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/40 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>←</span>
              <span>All Games</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Sound Controls */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {isMuted ? "🔇" : volume > 0.5 ? "🔊" : "🔉"}
                </button>

                {showVolumeSlider && (
                  <div
                    onMouseLeave={() => setShowVolumeSlider(false)}
                    className="absolute right-0 top-11 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl backdrop-blur-xl animate-fade-in"
                  >
                    <span className="text-xs text-slate-400">Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="h-1.5 w-24 accent-cyan-400"
                      aria-label="Volume slider"
                    />
                  </div>
                )}
              </div>

              {/* Pause Toggle */}
              {onPauseToggle && isPlaying && (
                <button
                  type="button"
                  onClick={onPauseToggle}
                  aria-label={isPaused ? "Resume game" : "Pause game"}
                  className="flex h-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
              )}

              {/* How to Play button */}
              {howToPlayText && (
                <button
                  type="button"
                  onClick={() => setShowHowToPlay(true)}
                  className="flex h-9 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 text-xs font-semibold text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  ❓ Help
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {/* Title Header */}
            <div className="mb-6 text-center">
              <h1 className="mb-2 flex items-center justify-center gap-3 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
                <span>{icon}</span>
                <span>{title}</span>
              </h1>
              <p className="mx-auto max-w-lg text-sm text-slate-400 sm:text-base">{description}</p>
            </div>

            {/* Scoreboard Bar */}
            {(score !== undefined || highScore !== undefined) && (
              <div className="mb-6 flex items-center justify-center gap-6 sm:gap-10">
                {score !== undefined && (
                  <div className="min-w-24 rounded-2xl border border-cyan-500/20 bg-slate-950/60 px-4 py-2.5 text-center shadow-lg backdrop-blur-md">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{scoreLabel}</p>
                    <p className="text-2xl font-bold text-cyan-300 sm:text-3xl">{score}</p>
                  </div>
                )}
                {highScore !== undefined && (
                  <div className="min-w-24 rounded-2xl border border-cyan-500/20 bg-slate-950/60 px-4 py-2.5 text-center shadow-lg backdrop-blur-md">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{highScoreLabel}</p>
                    <p className="text-2xl font-bold text-cyan-300 sm:text-3xl">{highScore}</p>
                  </div>
                )}
              </div>
            )}

            {/* Custom Controls Bar */}
            {customControls && <div className="mb-6 flex flex-wrap items-center justify-center gap-3">{customControls}</div>}

            {/* Game Canvas / Component Container */}
            <div className="relative rounded-3xl border border-cyan-500/20 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-6">
              {children}
            </div>

            {/* Mobile Touch D-Pad Controls */}
            {mobileControls && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Touch Controls</p>
                <div className="flex flex-col items-center gap-2">
                  {mobileControls.onUp && (
                    <button
                      type="button"
                      onClick={mobileControls.onUp}
                      className="flex h-12 w-16 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-xl text-cyan-200 active:bg-cyan-600 active:text-white"
                      aria-label="Move Up"
                    >
                      ▲
                    </button>
                  )}
                  <div className="flex gap-2">
                    {mobileControls.onLeft && (
                      <button
                        type="button"
                        onClick={mobileControls.onLeft}
                        className="flex h-12 w-16 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-xl text-cyan-200 active:bg-cyan-600 active:text-white"
                        aria-label="Move Left"
                      >
                        ◀
                      </button>
                    )}
                    {mobileControls.onAction && (
                      <button
                        type="button"
                        onClick={mobileControls.onAction}
                        className="flex h-12 min-w-16 px-4 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-sm font-bold text-emerald-200 active:bg-emerald-600 active:text-white"
                        aria-label={mobileControls.actionLabel || "Action"}
                      >
                        {mobileControls.actionLabel || "ACTION"}
                      </button>
                    )}
                    {mobileControls.onRight && (
                      <button
                        type="button"
                        onClick={mobileControls.onRight}
                        className="flex h-12 w-16 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-xl text-cyan-200 active:bg-cyan-600 active:text-white"
                        aria-label="Move Right"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                  {mobileControls.onDown && (
                    <button
                      type="button"
                      onClick={mobileControls.onDown}
                      className="flex h-12 w-16 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-xl text-cyan-200 active:bg-cyan-600 active:text-white"
                      aria-label="Move Down"
                    >
                      ▼
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-slate-950 p-6 text-slate-200 shadow-2xl">
            <h3 className="mb-3 text-xl font-bold text-cyan-100 flex items-center gap-2">
              <span>{icon}</span> How to play {title}
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-300">{howToPlayText}</p>
            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
