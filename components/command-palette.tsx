"use client";

import { useTheme } from "@/lib/theme-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  title: string;
  category: "Game" | "Tool" | "Action";
  icon: string;
  path?: string;
  action?: () => void;
}

export function CommandPalette() {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setIsSettingsOpen } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const commands: CommandItem[] = [
    { id: "chess", title: "Online Chess", category: "Game", icon: "♟️", path: "/chess" },
    { id: "img-analyser", title: "AI Vision Analyser", category: "Tool", icon: "🖼️", path: "/analyser/image" },
    { id: "doc-analyser", title: "AI Document Workspace", category: "Tool", icon: "📄", path: "/analyser/document" },
    { id: "home", title: "Home", category: "Action", icon: "🏠", path: "/" },
    { id: "settings", title: "Open Customization Settings", category: "Action", icon: "⚙️", action: () => setIsSettingsOpen(true) },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const executeCommand = (cmd: CommandItem) => {
    setIsCommandPaletteOpen(false);
    setQuery("");
    if (cmd.path) {
      router.push(cmd.path);
    } else if (cmd.action) {
      cmd.action();
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center bg-slate-950/80 p-4 pt-20 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-2xl">
        {/* Search Bar */}
        <div className="flex items-center border-b border-slate-800 px-4 py-3">
          <span className="mr-3 text-lg text-slate-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search chess & AI tools..."
            className="w-full bg-transparent text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-[0.65rem] font-bold text-slate-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.map((cmd, idx) => (
            <button
              key={cmd.id}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                selectedIndex === idx
                  ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-200"
                  : "text-slate-300 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cmd.icon}</span>
                <span className="text-sm font-semibold">{cmd.title}</span>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase text-slate-400">
                {cmd.category}
              </span>
            </button>
          ))}

          {filteredCommands.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
