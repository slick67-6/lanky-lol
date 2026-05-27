"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  imageMetadata?: {
    capturedAt: string;
    source: "upload" | "paste";
  };
};

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|\$[^$\n]+\$|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-bold`} className="font-semibold text-slate-50">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("$")) {
      nodes.push(
        <span key={`${match.index}-math`} className="font-medium italic text-cyan-200">
          {token.slice(1, -1)}
        </span>,
      );
    } else {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function AssistantContent({ content }: { content: string }) {
  const segments = content.split(/```([\s\S]*?)```/g);
  return (
    <div className="space-y-2">
      {segments.map((segment, i) => {
        if (i % 2 === 1) {
          return (
            <pre
              key={`code-${i}`}
              className="overflow-x-auto rounded-xl border border-slate-700/70 bg-[#0b1220] p-3"
            >
              <code className="font-mono text-[0.86em] text-cyan-100">{segment.trim()}</code>
            </pre>
          );
        }

        const lines = segment.split("\n");
        return (
          <div key={`txt-${i}`} className="space-y-1 whitespace-pre-wrap">
            {lines.map((line, idx) => {
              const blockMath = line.match(/^\$\$([\s\S]+)\$\$$/);
              if (blockMath) {
                return (
                  <p key={idx} className="overflow-x-auto text-center font-semibold italic text-cyan-100">
                    {blockMath[1]}
                  </p>
                );
              }
              return <p key={idx}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ImageAnalyserPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Drop an image, paste from clipboard, or ask me anything. I can see and reason about what you send.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageSource, setPendingImageSource] = useState<"upload" | "paste">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const animateAssistantReply = useCallback(async (reply: string) => {
    const messageId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: "" }]);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: reply } : m)),
      );
      return;
    }

    const step = reply.length > 2400 ? 12 : reply.length > 1200 ? 9 : 6;
    for (let i = 0; i < reply.length; i += step) {
      const next = reply.slice(0, i + step);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: next } : m)),
      );
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const attachFile = (file: File, source: "upload" | "paste" = "upload") => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
      setError("Please attach an image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    setPendingImageSource(source);
    reader.readAsDataURL(file);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "(Image attached)",
      imagePreview: pendingImage ?? undefined,
      imageMetadata: pendingImage
        ? {
            capturedAt: new Date().toISOString(),
            source: pendingImageSource,
          }
        : undefined,
    };

    const nextMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg];
    setMessages(nextMessages);
    setInput("");
    setPendingImage(null);
    setPendingImageSource("upload");
    setLoading(true);
    setError(null);

    try {
      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        image: m.role === "user" ? m.imagePreview : undefined,
        imageMetadata: m.role === "user" ? m.imageMetadata : undefined,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed.");

      await animateAssistantReply(data.reply ?? "");

    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            attachFile(file, "paste");
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader title="AI Image Analyzer" />

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[96%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed sm:max-w-[85%] sm:px-4 sm:text-base ${
                    m.role === "user"
                      ? "border border-cyan-500/30 bg-cyan-950/60 text-cyan-50"
                      : "border border-slate-700/60 bg-slate-900/70 text-slate-200"
                  }`}
                >
                  {m.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imagePreview}
                      alt="Uploaded"
                      className="mb-3 max-h-56 w-full rounded-lg object-contain"
                    />
                  )}
                  {m.role === "assistant" ? (
                    <AssistantContent content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse [animation-delay:150ms]">
                      ●
                    </span>
                    <span className="animate-pulse [animation-delay:300ms]">
                      ●
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="relative z-10 mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {pendingImage && (
          <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="Pending upload"
              className="h-16 w-16 rounded-lg border border-cyan-500/30 object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPendingImage(null);
                setPendingImageSource("upload");
              }}
              className="text-xs text-slate-400 hover:text-cyan-300"
            >
              Remove image
            </button>
          </div>
        )}

        <div className="relative z-10 shrink-0 border-t border-cyan-500/15 bg-[#030712]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-3xl items-end gap-2 sm:gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif,.webp,.avif,.bmp,.tiff,.tif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachFile(f, "upload");
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-950/50 text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
              aria-label="Attach image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message or paste an image…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 sm:text-base"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || (!input.trim() && !pendingImage)}
              className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
