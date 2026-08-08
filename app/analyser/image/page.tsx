"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
};

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 900;
const COMPRESSED_IMAGE_QUALITY = 0.68;
const AUTO_SCROLL_THRESHOLD = 120;

const PROMPT_SUGGESTIONS = [
  "Explain this image in detail",
  "Extract all visible text",
  "What should I improve?",
  "Write code for this UI",
];

function canCanvasRead(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"].includes(file.type);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that image file."));
    reader.readAsDataURL(file);
  });
}

async function compressImageForChat(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);

  if (!canCanvasRead(file)) {
    return originalDataUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare that image for upload."));
    img.src = originalDataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  if (scale === 1 && file.size <= MAX_UPLOAD_BYTES / 2) {
    return originalDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return originalDataUrl;

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", COMPRESSED_IMAGE_QUALITY);
}

export default function ImageAnalyserPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to **Lanky AI Vision**! Drop an image, paste from your clipboard, or choose a prompt suggestion below. I maintain visual context across our chat.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const animateAssistantReply = useCallback(async (reply: string) => {
    const messageId = crypto.randomUUID();
    if (!reply.trim()) throw new Error("Empty response from vision model.");
    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: reply.trim() }]);
  }, []);

  const streamAssistantReply = useCallback(async (body: ReadableStream<Uint8Array>) => {
    const messageId = crypto.randomUUID();
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
      }

      reply += decoder.decode();
      if (!reply.trim()) throw new Error("Empty response from vision model.");
      setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: reply.trim() }]);
    } finally {
      setStreamingMessageId(null);
      reader.releaseLock();
    }

    if (!reply.trim()) {
      throw new Error("Empty response from vision model.");
    }
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < AUTO_SCROLL_THRESHOLD;
  }, []);

  const scrollChatToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const updateChatAutoScroll = useCallback(() => {
    const nearBottom = isNearBottom();
    if (!nearBottom) {
      shouldAutoScrollRef.current = false;
      return;
    }
    if (!loading) {
      shouldAutoScrollRef.current = true;
    }
  }, [isNearBottom, loading]);

  const pauseAutoScroll = useCallback(() => {
    shouldAutoScrollRef.current = false;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollChatToBottom(loading ? "auto" : "smooth");
    }
  }, [messages, loading, scrollChatToBottom]);

  const attachFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
        showToast("Please attach a valid image file.", "error");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES && !canCanvasRead(file)) {
        showToast("Please choose a smaller image (max 12MB).", "error");
        return;
      }

      setError(null);

      try {
        const dataUrl = await compressImageForChat(file);
        setPendingImage(dataUrl);
        showToast("Image attached successfully!", "success");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Could not attach image.", "error");
      }
    },
    [showToast]
  );

  const send = async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "(Image attached)",
      imagePreview: pendingImage ?? undefined,
    };

    const nextMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg];
    shouldAutoScrollRef.current = true;
    setMessages(nextMessages);
    setInput("");
    setPendingImage(null);
    setLoading(true);
    setError(null);
    requestAnimationFrame(() => scrollChatToBottom("smooth"));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const latestImageMessageId = [...nextMessages]
        .reverse()
        .find((m) => m.role === "user" && m.imagePreview)?.id;
      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        image: m.id === latestImageMessageId ? m.imagePreview : undefined,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const rawResponse = await res.text();
        let data: { error?: string } = {};
        try {
          data = rawResponse ? (JSON.parse(rawResponse) as { error?: string }) : {};
        } catch {
          throw new Error(rawResponse.trim() || "Model response failed.");
        }
        throw new Error(data.error || "Request failed.");
      }

      if (res.body) {
        await streamAssistantReply(res.body);
      } else {
        const rawResponse = await res.text();
        const data = rawResponse ? (JSON.parse(rawResponse) as { reply?: string }) : {};
        await animateAssistantReply(data.reply ?? "");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError(null);
      } else {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
        showToast(msg, "error");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingMessageId(null);
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const stopResponse = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setStreamingMessageId(null);
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
            attachFile(file);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attachFile]);

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#030712] text-slate-100">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader title="AI Image Analyser" />

        {/* Message Log */}
        <div
          ref={scrollRef}
          onScroll={updateChatAutoScroll}
          onTouchMove={pauseAutoScroll}
          onTouchStart={pauseAutoScroll}
          onWheel={pauseAutoScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [touch-action:pan-y] sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[92%] sm:max-w-[85%] rounded-3xl px-4 py-3.5 text-sm leading-relaxed shadow-2xl transition-all ${
                    m.role === "user"
                      ? "border border-white/[0.12] bg-white/[0.07] text-white shadow-black/30"
                      : "border border-white/[0.09] bg-white/[0.04] text-white/80 shadow-black/60 backdrop-blur-xl"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-white/35">
                      <span className="h-2 w-2 rounded-full bg-white/50" />
                      {streamingMessageId === m.id ? "Thinking live..." : "Lanky Vision AI"}
                    </div>
                  )}

                  {m.imagePreview && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.imagePreview}
                      alt="Uploaded preview"
                      className="mb-3 max-h-60 w-full rounded-2xl border border-white/10 object-contain"
                    />
                  )}

                  {m.role === "assistant" ? (
                    <MarkdownRenderer>{m.content}</MarkdownRenderer>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && !streamingMessageId && (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 px-5 py-3.5 text-sm text-slate-400 shadow-xl backdrop-blur-xl">
                  <div className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-white/35">Analyzing Image</div>
                  <span className="inline-flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="relative z-10 mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-rose-400">
            {error}
          </p>
        )}

        {pendingImage && (
          <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="Pending upload"
              className="h-16 w-16 rounded-xl border border-white/20 object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              Remove image
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative z-10 shrink-0 border-t border-white/[0.07] bg-[#030712]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto mb-3 flex max-w-3xl gap-2 overflow-x-auto pb-1">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                disabled={loading}
                className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/50 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif,.webp,.avif,.bmp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachFile(f);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.05] text-white/50 transition-all hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Attach image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
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
              placeholder={loading ? "Generating response..." : "Ask a question or paste an image..."}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 sm:text-base"
            />

            <button
              type="button"
              onClick={loading ? stopResponse : send}
              disabled={!loading && !input.trim() && !pendingImage}
              className={`flex h-11 shrink-0 items-center justify-center rounded-2xl px-6 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                loading ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-white text-[#030712] hover:bg-white/90 shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
              }`}
            >
              {loading ? "Stop" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
