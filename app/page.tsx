"use client";

import { useCallback, useRef, useState } from "react";

const MODES = [
  { id: "describe", label: "Describe" },
  { id: "objects", label: "Objects" },
  { id: "text", label: "Read text" },
  { id: "accessibility", label: "Alt text" },
] as const;

type ModeId = (typeof MODES)[number]["id"];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeId>("describe");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8 MB.");
      return;
    }
    setError(null);
    setAnalysis("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const analyze = async () => {
    if (!preview) {
      setError("Upload an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, mode }),
      });
      const data = (await res.json()) as { analysis?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }
      setAnalysis(data.analysis ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="space-y-2 text-center sm:text-left">
          <p className="text-sm font-medium tracking-wide text-violet-400">
            lanky.lol
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            AI Image Analyzer
          </h1>
          <p className="text-zinc-400">
            Upload a photo and get an instant breakdown powered by Venice vision.
          </p>
        </header>

        <section
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-14 transition hover:border-violet-500/60 hover:bg-zinc-900"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Upload preview"
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
          ) : (
            <>
              <span className="text-4xl">🖼️</span>
              <p className="text-center text-sm text-zinc-400">
                Drop an image here or click to browse
              </p>
            </>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === m.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!preview || loading}
          onClick={analyze}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze image"}
        </button>

        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {analysis && (
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Result
            </h2>
            <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
              {analysis}
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
