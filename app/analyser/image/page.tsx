"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { useCallback, useEffect, useRef, useState } from "react";

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
const COMING_SOON_FEATURES = [
  "Chess analysis and assistance",
  "Deeper thinking capabilities",
  "Musical capabilities and file creation",
  "Online search capabilities",
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

function renderInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\\\([^\n]+?\\\)|\$[^$\n]+\$|\*[^*\n]+\*|_[^_\n]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;
    const link = token.match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/);

    if (link) {
      nodes.push(
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-100"
        >
          {link[1]}
        </a>,
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-50">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(
        <del key={key} className="text-slate-400 decoration-slate-500">
          {token.slice(2, -2)}
        </del>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      nodes.push(
        <span key={key} className="rounded bg-cyan-950/30 px-1 font-mono text-[0.95em] text-cyan-100">
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith("$") && token.endsWith("$")) {
      nodes.push(
        <span key={key} className="rounded bg-cyan-950/30 px-1 font-mono text-[0.95em] text-cyan-100">
          {token.slice(1, -1)}
        </span>,
      );
    } else {
      nodes.push(
        <em key={key} className="italic text-slate-100">
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function isTableDelimiter(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderDisplayMath(value: string, key: React.Key) {
  return (
    <div key={key} className="max-w-full overflow-x-auto rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-center font-mono text-sm text-cyan-100 [touch-action:pan-x]">
      {value.trim()}
    </div>
  );
}

function renderTextBlock(segment: string) {
  const lines = segment.split("\n");
  const blocks: React.ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("$$")) {
      const mathLines = [trimmed.replace(/^\$\$\s?/, "")];
      while (index + 1 < lines.length && !lines[index + 1].trim().endsWith("$$")) {
        index += 1;
        mathLines.push(lines[index]);
      }
      if (index + 1 < lines.length) {
        index += 1;
        mathLines.push(lines[index].trim().replace(/\s?\$\$$/, ""));
      } else {
        mathLines[mathLines.length - 1] = mathLines[mathLines.length - 1].replace(/\s?\$\$$/, "");
      }
      blocks.push(renderDisplayMath(mathLines.join("\n"), `math-${index}`));
      continue;
    }

    if (trimmed.startsWith("\\[")) {
      const mathLines = [trimmed.replace(/^\\\[\s?/, "")];
      while (index + 1 < lines.length && !lines[index + 1].trim().endsWith("\\]")) {
        index += 1;
        mathLines.push(lines[index]);
      }
      if (index + 1 < lines.length) {
        index += 1;
        mathLines.push(lines[index].trim().replace(/\s?\\\]$/, ""));
      } else {
        mathLines[mathLines.length - 1] = mathLines[mathLines.length - 1].replace(/\s?\\\]$/, "");
      }
      blocks.push(renderDisplayMath(mathLines.join("\n"), `bracket-math-${index}`));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6) as 3 | 4 | 5 | 6;
      const HeadingTag = `h${level}` as "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <HeadingTag key={index} className="mt-3 font-semibold leading-snug text-cyan-50 first:mt-0">
          {renderInline(heading[2])}
        </HeadingTag>,
      );
      continue;
    }

    if (index + 1 < lines.length && trimmed.includes("|") && isTableDelimiter(lines[index + 1])) {
      const headers = splitTableRow(trimmed);
      index += 1;
      const rows: string[][] = [];
      while (index + 1 < lines.length && lines[index + 1].trim().includes("|")) {
        index += 1;
        rows.push(splitTableRow(lines[index]));
      }
      blocks.push(
        <div key={`table-${index}`} className="max-w-full overflow-x-auto rounded-xl border border-slate-700/70 [touch-action:pan-x]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-900/80 text-cyan-100">
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={headerIndex} className="border-b border-slate-700/70 px-3 py-2 font-semibold">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-slate-950/30">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-t border-slate-800/70 px-3 py-2 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: Array<{ text: string; checked?: boolean }> = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) {
          const next = lines[index + 1]?.trim() ?? "";
          if (/^[-*]\s+/.test(next)) {
            index += 1;
            continue;
          }
          break;
        }
        if (!/^[-*]\s+/.test(current)) break;

        const checkbox = current.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
        items.push(
          checkbox
            ? { checked: checkbox[1].toLowerCase() === "x", text: checkbox[2] }
            : { text: current.replace(/^[-*]\s+/, "") },
        );
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={`ul-${index}`} className="ml-5 list-disc space-y-1">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className={item.checked !== undefined ? "list-none" : undefined}>
              {item.checked !== undefined && (
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded border border-cyan-500/50 text-[0.65rem] text-cyan-200">
                  {item.checked ? "✓" : ""}
                </span>
              )}
              {renderInline(item.text)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) {
          const next = lines[index + 1]?.trim() ?? "";
          if (/^\d+[.)]\s+/.test(next)) {
            index += 1;
            continue;
          }
          break;
        }
        if (!/^\d+[.)]\s+/.test(current)) break;

        items.push(current.replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ol key={`ol-${index}`} className="ml-5 list-decimal space-y-1">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <blockquote key={`quote-${index}`} className="space-y-1 border-l-2 border-cyan-500/50 pl-3 text-slate-300">
          {quoteLines.map((quote, quoteIndex) => (
            <p key={quoteIndex} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {renderInline(quote)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    blocks.push(
      <p key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {renderInline(line)}
      </p>,
    );
  }

  return blocks;
}

function AssistantContent({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  const segments = content.split(/```([\s\S]*?)```/g);
  return (
    <div className="min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere]">
      {segments.map((segment, i) => {
        if (i % 2 === 1) {
          return (
            <pre
              key={`code-${i}`}
              className="max-w-full overflow-x-auto rounded-xl border border-slate-700/70 bg-[#0b1220] p-3 [touch-action:pan-x]"
            >
              <code className="font-mono text-[0.86em] text-cyan-100">{segment.trim()}</code>
            </pre>
          );
        }

        return (
          <div key={`txt-${i}`} className="min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere]">
            {renderTextBlock(segment)}
          </div>
        );
      })}
      {isStreaming && (
        <span className="inline-block h-5 w-2 translate-y-1 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.75)]" aria-hidden />
      )}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const animateAssistantReply = useCallback(async (reply: string) => {
    const messageId = crypto.randomUUID();
    setStreamingMessageId(messageId);
    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: "" }]);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: reply } : m)),
      );
      setStreamingMessageId(null);
      return;
    }

    const step = reply.length > 2400 ? 36 : reply.length > 1200 ? 28 : 18;
    for (let i = 0; i < reply.length; i += step) {
      const next = reply.slice(0, i + step);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: next } : m)),
      );
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
    setStreamingMessageId(null);
  }, []);


  const streamAssistantReply = useCallback(async (body: ReadableStream<Uint8Array>) => {
    const messageId = crypto.randomUUID();
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    setStreamingMessageId(messageId);
    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: "" }]);

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: reply } : m)),
        );
      }

      reply += decoder.decode();
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: reply } : m)),
      );
    } finally {
      setStreamingMessageId(null);
      reader.releaseLock();
    }

    if (!reply.trim()) {
      throw new Error("Empty response from model.");
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearBottom();
  }, [isNearBottom]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollChatToBottom(loading ? "auto" : "smooth");
    }
  }, [messages, loading, scrollChatToBottom]);

  const attachFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
      setError("Please attach an image file.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES && !canCanvasRead(file)) {
      setError("Please choose a smaller image, or convert it to JPG/PNG first.");
      return;
    }

    setError(null);

    try {
      const dataUrl = await compressImageForChat(file);
      setPendingImage(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare that image.");
    }
  }, []);

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
    setPlusMenuOpen(false);
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
        body: JSON.stringify({
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const rawResponse = await res.text();
        let data: { error?: string } = {};

        try {
          data = rawResponse ? (JSON.parse(rawResponse) as { error?: string }) : {};
        } catch {
          const fallbackMessage = rawResponse.trim() || "The analyser returned an unreadable response.";
          throw new Error(fallbackMessage);
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
        setError(e instanceof Error ? e.message : "Something went wrong.");
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
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader title="AI Image Analyser" />

        <div
          ref={scrollRef}
          onScroll={updateChatAutoScroll}
          onTouchMove={pauseAutoScroll}
          onTouchStart={pauseAutoScroll}
          onWheel={pauseAutoScroll}
          className="min-h-0 flex-1 overflow-auto overscroll-auto px-4 py-4 [touch-action:pan-x_pan-y] sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3 sm:gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`group flex min-w-0 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative min-w-0 max-w-[96%] rounded-[1.35rem] px-3.5 py-3 text-sm leading-relaxed shadow-2xl transition-all duration-300 sm:max-w-[85%] sm:px-4 sm:text-base ${
                    m.role === "user"
                      ? "border border-cyan-400/25 bg-cyan-500/10 text-cyan-50 shadow-cyan-950/30"
                      : "border border-slate-700/60 bg-slate-950/70 text-slate-200 shadow-slate-950/50 backdrop-blur-xl"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
                      {streamingMessageId === m.id ? "Thinking live" : "Lanky AI"}
                    </div>
                  )}
                  {m.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imagePreview}
                      alt="Uploaded"
                      className="mb-3 max-h-56 w-full rounded-xl border border-white/10 object-contain"
                    />
                  )}
                  {m.role === "assistant" ? (
                    <AssistantContent content={m.content} isStreaming={streamingMessageId === m.id} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && !streamingMessageId && (
              <div className="flex justify-start">
                <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-sm text-slate-400 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
                  <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">Preparing response</div>
                  <span className="inline-flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:300ms]" />
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
              onClick={() => setPendingImage(null)}
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
                if (f) attachFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-950/50 text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-100"
              aria-label="Attach image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <div className="relative shrink-0">
              {plusMenuOpen && (
                <div className="absolute -left-14 bottom-14 w-[min(18rem,calc(100vw-2rem))] origin-bottom-left animate-[plus-menu-in_180ms_ease-out] overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/95 p-2 text-sm text-slate-200 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
                  {COMING_SOON_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-slate-400">
                      <span>{feature}</span>
                      <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-slate-500">
                        (coming soon)
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPlusMenuOpen((open) => !open)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-950/50 text-2xl leading-none text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-100 ${plusMenuOpen ? "rotate-45 scale-105" : "rotate-0"}`}
                aria-expanded={plusMenuOpen}
                aria-label="Open coming soon chat features"
              >
                +
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setPlusMenuOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={loading ? "You can scroll or stop while I answer…" : "Message or paste an image…"}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 shadow-inner shadow-slate-950/60 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 sm:text-base"
            />
            <button
              type="button"
              onClick={loading ? stopResponse : send}
              disabled={!loading && !input.trim() && !pendingImage}
              className={`flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                loading ? "bg-rose-600 hover:bg-rose-500" : "bg-cyan-600 hover:bg-cyan-500"
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
