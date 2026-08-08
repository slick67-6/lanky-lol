"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { DocumentAsset, ExtractedDocument } from "@/lib/document-extractor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TabType = "notes" | "answers" | "quiz" | "chat";
type ViewType = "landing" | "analysis";
type GeneratedAnalysis = { notes: string; answers: string; quiz: string };

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;
const ANALYSIS_CHUNK_SIZE = 22_000;
const SMALL_FILE_BYTES = 1 * 1024 * 1024;
const MEDIUM_FILE_BYTES = 5 * 1024 * 1024;

function canParseFile(file: File) {
  const supportedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "text/plain",
  ];
  return supportedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|pptx|xls|xlsx|xlsm|txt)$/i);
}

function quizCountForSize(sizeBytes: number) {
  if (sizeBytes <= SMALL_FILE_BYTES) return 3;
  if (sizeBytes <= MEDIUM_FILE_BYTES) return 5;
  return 10;
}

function splitIntoChunks(text: string, chunkSize = ANALYSIS_CHUNK_SIZE) {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += chunkSize) {
    chunks.push(text.slice(start, start + chunkSize));
  }
  return chunks.length ? chunks : ["[No extractable text was found in this document.] "];
}

export default function DocumentAnalyserPage() {
  const [view, setView] = useState<ViewType>("landing");
  const [activeTab, setActiveTab] = useState<TabType>("notes");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentAssets, setDocumentAssets] = useState<DocumentAsset[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<ExtractedDocument["metadata"] | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing document...");
  const [loadingDetail, setLoadingDetail] = useState("Preparing extraction pipeline.");
  const [generatedAnalysis, setGeneratedAnalysis] = useState<GeneratedAnalysis | null>(null);

  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
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
      if (!canParseFile(file)) {
        showToast("Please upload a PDF, DOCX, PPTX, XLS, XLSX, XLSM, or text file.", "error");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        showToast("File exceeds the 512MB browser analysis limit.", "error");
        return;
      }

      setError(null);
      setPendingFile(file);
      showToast(`Selected "${file.name}"`, "info");
    },
    [showToast]
  );

  const readStreamText = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let output = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }
      output += decoder.decode();
      return output.trim();
    } finally {
      reader.releaseLock();
    }
  };

  const splitGeneratedAnalysis = (raw: string): GeneratedAnalysis => {
    const notesMatch = raw.match(/\*{0,2}NOTES\*{0,2}:?\s*([\s\S]*?)(?:\*{0,2}ANSWERS\*{0,2}:?\s*|\*{0,2}QUIZ\*{0,2}:?\s*|$)/i);
    const answersMatch = raw.match(/\*{0,2}ANSWERS\*{0,2}:?\s*([\s\S]*?)(?:\*{0,2}QUIZ\*{0,2}:?\s*|$)/i);
    const quizMatch = raw.match(/\*{0,2}QUIZ\*{0,2}:?\s*([\s\S]*)/i);

    return {
      notes: notesMatch?.[1]?.trim() || raw || "Extracted notes preview ready.",
      answers: answersMatch?.[1]?.trim() || "Use the Chat tab to ask questions.",
      quiz: quizMatch?.[1]?.trim() || "Ask Chat to generate custom quizzes.",
    };
  };

  const generateDocumentAnalysis = async (document: ExtractedDocument, fileName: string) => {
    const quizCount = quizCountForSize(document.metadata.sizeBytes);
    const chunks = splitIntoChunks(document.text);
    const analysisChunks = chunks.length > 48
      ? [...chunks.slice(0, 24), ...chunks.slice(-24)]
      : chunks;
    const chunkNotes: string[] = [];

    if (analysisChunks.length > 1) {
      for (let index = 0; index < analysisChunks.length; index += 1) {
        setLoadingMessage("Reading every section...");
        setLoadingDetail(`Building an understanding of section ${index + 1} of ${analysisChunks.length}.`);
        setLoadingProgress(55 + Math.round((index / analysisChunks.length) * 25));
        const chunkResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `Read this section of "${fileName}" and extract concrete facts, definitions, arguments, examples, calculations, questions, and answers. Keep it dense and factual so another model can use it in a final document analysis. Section ${index + 1} of ${analysisChunks.length}.`,
              documentContext: analysisChunks[index],
            }],
          }),
        });
        if (!chunkResponse.ok || !chunkResponse.body) throw new Error("AI analysis service unavailable.");
        chunkNotes.push(await readStreamText(chunkResponse.body));
      }
    } else {
      chunkNotes.push(document.text);
    }

    setLoadingProgress(86);
    setLoadingMessage("Writing your study pack...");
    setLoadingDetail("Turning extracted content into takeaways, answers, and a size-aware quiz.");
    const context = chunkNotes.join("\n\n--- SECTION SUMMARY ---\n\n");
    const imageSources = document.assets.filter((asset) => asset.kind === "image" || asset.kind === "page").slice(0, 4).map((asset) => asset.src);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `Analyse the complete document "${fileName}". Return exactly three labelled Markdown sections: NOTES:, ANSWERS:, QUIZ:.

NOTES must be key takeaways and important new information, including slide-by-slide themes when relevant. Do not write generic study advice.
ANSWERS must answer the useful questions and problems found in the document, including maths, English, grammar, definitions, exercises, or worked examples. Show concise reasoning for calculations and correct the answer if the source is ambiguous.
QUIZ must contain exactly ${quizCount} questions with answers hidden under each answer line. Vary the question types and cover the most important material. Use Markdown headings, lists, tables, and LaTeX math where helpful.

Document format: ${document.metadata.format}. Extracted size: ${Math.round(document.metadata.sizeBytes / 1024 / 1024)}MB. Embedded/page images available: ${document.metadata.imageCount}.
${chunks.length > 48 ? "The source was very large, so the section summaries below represent the beginning and end of the document plus representative sections." : "Use all of the extracted source below."}`,
          documentContext: context,
          documentImages: imageSources,
        }],
      }),
    });

    if (!res.ok || !res.body) throw new Error("AI analysis service unavailable.");
    return splitGeneratedAnalysis(await readStreamText(res.body));
  };

  const processDocument = async () => {
    if (!pendingFile || loading) return;

    setShowLoadingScreen(true);
    setLoadingProgress(10);
    setLoadingMessage("Reading file...");
    setLoadingDetail("Opening document buffer and validating structure.");
    setError(null);

    try {
      setLoadingProgress(35);
      setLoadingMessage("Extracting document content...");
      setLoadingDetail("Reading text, tables, formulas, slide structure, and embedded media locally in your browser.");
      const { extractDocument } = await import("@/lib/document-extractor");
      const extracted = await extractDocument(pendingFile, (progress, detail) => {
        setLoadingProgress(35 + Math.round(progress * 0.3));
        setLoadingDetail(detail);
      });
      const content = extracted.text;
      setDocumentContent(content);
      setDocumentAssets(extracted.assets);
      setDocumentMetadata(extracted.metadata);
      setDocumentName(pendingFile.name);

      setLoadingProgress(70);
      setLoadingMessage("Generating AI study pack...");

      try {
        const analysis = await generateDocumentAnalysis(extracted, pendingFile.name);
        setGeneratedAnalysis(analysis);
      } catch {
        setGeneratedAnalysis({
          notes: `Document content extracted successfully.\n\n${content.slice(0, 2200)}${content.length > 2200 ? "…" : ""}`,
          answers: "The AI study pack could not be generated. Use Chat to ask about the extracted content.",
          quiz: `The AI study pack could not be generated. Use Chat to create a ${quizCountForSize(pendingFile.size)}-question quiz.`,
        });
      }

      setLoadingProgress(100);
      setShowLoadingScreen(false);
      setView("analysis");
      setActiveTab("notes");
      setPendingFile(null);

      showToast("Document workspace ready!", "success");

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `**${pendingFile.name}** is ready. I extracted the document text and ${extracted.metadata.imageCount} embedded/page image${extracted.metadata.imageCount === 1 ? "" : "s"}. Explore the study pack or ask me anything about it.`,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Document analysis failed.";
      setError(msg);
      showToast(msg, "error");
      setShowLoadingScreen(false);
    }
  };

  const streamAssistantReply = useCallback(async (body: ReadableStream<Uint8Array>) => {
    const messageId = crypto.randomUUID();
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let reply = "";
    let lastPaintAt = 0;
    let lastPaintLength = 0;

    const paint = () => {
      setStreamingMessageId(messageId);
      setMessages((prev) => {
        const existing = prev.some((message) => message.id === messageId);
        return existing
          ? prev.map((message) => (message.id === messageId ? { ...message, content: reply } : message))
          : [...prev, { id: messageId, role: "assistant", content: reply }];
      });
      lastPaintAt = performance.now();
      lastPaintLength = reply.length;
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
        if (reply && (lastPaintLength === 0 || performance.now() - lastPaintAt > 45 || reply.length - lastPaintLength > 180)) {
          paint();
        }
      }

      reply += decoder.decode();
      if (!reply.trim()) throw new Error("Empty response from document model.");
      reply = reply.trim();
      paint();
    } finally {
      setStreamingMessageId(null);
      reader.releaseLock();
    }
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    shouldAutoScrollRef.current = true;
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    requestAnimationFrame(() => scrollChatToBottom("smooth"));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const followUpImages: string[] = [];
      let followUpImageBytes = 0;
      for (const asset of documentAssets.slice(0, 4)) {
        const size = asset.src.length;
        if (followUpImageBytes + size > 2_500_000) break;
        followUpImages.push(asset.src);
        followUpImageBytes += size;
      }
      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        documentContext: m.id === userMsg.id ? documentContent : undefined,
        documentImages: m.id === userMsg.id ? followUpImages : undefined,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Request failed.");
      if (res.body) await streamAssistantReply(res.body);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        const msg = e instanceof Error ? e.message : "Error sending message.";
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

  if (view === "landing") {
    return (
      <div className="flex min-h-dvh w-full flex-col bg-[#030712] text-slate-100">
        <ParticlesBackground />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <SiteHeader title="AI Document Workspace" />

          <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
            <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
              <div className="text-center lg:text-left">
                <span className="mb-2 inline-block rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Document Workspace
                </span>
                <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-white sm:text-4xl">
                  AI Document Workspace
                </h1>
                <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                  Upload PDFs, Word docs, PowerPoint decks, Excel workbooks, or text. Extract the source locally, then turn it into notes, answers, visual context, and a right-sized quiz.
                </p>
              </div>

              <SpotlightCard className="p-6 sm:p-8">
                <div className="mb-6 rounded-2xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center transition-colors hover:border-white/[0.2]">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.xls,.xlsx,.xlsm,.txt"
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
                    className="flex flex-col items-center gap-3 w-full"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-3xl border border-white/[0.09]">
                      📄
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white/80">Click or drag & drop document</p>
                      <p className="text-xs text-slate-400">PDF, DOCX, PPTX, XLS, XLSX, XLSM, TXT · up to 512MB</p>
                    </div>
                  </button>
                </div>

                {pendingFile && (
                  <div className="mb-6 flex items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.04] p-4">
                    <div className="truncate text-left">
                      <p className="text-sm font-semibold text-white/80 truncate">{pendingFile.name}</p>
                      <p className="text-xs text-slate-400">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={() => setPendingFile(null)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {error && <p className="mb-4 text-xs text-rose-400">{error}</p>}

                <ShimmerButton
                  onClick={processDocument}
                  disabled={!pendingFile || loading}
                  className="w-full py-3.5 text-base"
                >
                  {pendingFile ? "Build study pack" : "Choose a document"}
                </ShimmerButton>
              </SpotlightCard>
            </div>
          </main>
        </div>

        {showLoadingScreen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0e0e0e] p-8 text-center shadow-2xl backdrop-blur-xl">
              <div className="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-white/10 border-t-white/70" />
              <h3 className="mb-2 text-lg font-bold text-white/90">{loadingMessage}</h3>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{loadingDetail}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#030712] text-slate-100">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader title="AI Document Workspace" />

        {/* Tab Navbar */}
        <div className="border-b border-white/[0.07] bg-[#030712]/95 px-4 py-2 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <button
              onClick={() => setView("landing")}
              className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/50 hover:bg-white/[0.08] transition-all"
            >
              ← Change File
            </button>

            <span className="truncate text-xs font-semibold text-white/30 max-w-xs">{documentName}</span>

            <AnimatedTabs
              tabs={[
                { id: "notes" as TabType, label: "Key notes", icon: "✦" },
                { id: "answers" as TabType, label: "Answers", icon: "↗" },
                { id: "quiz" as TabType, label: "Quiz", icon: "⌁" },
                { id: "chat" as TabType, label: "Chat", icon: "◌" },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>

        {/* Tab Workspace Views */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Format", value: documentMetadata?.format || "—" },
                { label: "Source size", value: documentMetadata ? `${(documentMetadata.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "—" },
                { label: documentMetadata?.sheetCount ? "Sheets" : documentMetadata?.pageCount ? "Pages / slides" : "Content", value: documentMetadata?.sheetCount?.toString() || documentMetadata?.pageCount?.toString() || "Extracted" },
                { label: "Media", value: documentMetadata ? `${documentMetadata.imageCount} visual${documentMetadata.imageCount === 1 ? "" : "s"}` : "—" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/30">{stat.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white/80">{stat.value}</p>
                </div>
              ))}
            </div>

            {documentAssets.length > 0 && activeTab !== "chat" && (
              <SpotlightCard className="mb-5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/30">Visual context</p>
                    <p className="mt-1 text-sm font-semibold text-white/80">Extracted images and page previews</p>
                  </div>
                  <span className="text-xs text-white/35">{documentAssets.length} available</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {documentAssets.slice(0, 8).map((asset) => (
                    <figure key={asset.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt={asset.label} className="h-28 w-full object-cover opacity-85 transition duration-300 hover:scale-[1.03] hover:opacity-100" />
                      <figcaption className="truncate px-2 py-1.5 text-[0.62rem] text-white/35">{asset.label}</figcaption>
                    </figure>
                  ))}
                </div>
              </SpotlightCard>
            )}

            {activeTab === "notes" && (
              <SpotlightCard className="p-6 sm:p-8">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-cyan-300/60">Signal extraction</p>
                    <h2 className="text-2xl font-bold text-white">Key takeaways</h2>
                  </div>
                  <span className="hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[0.68rem] font-semibold text-cyan-200 sm:inline-flex">Important information</span>
                </div>
                <MarkdownRenderer>{generatedAnalysis?.notes || ""}</MarkdownRenderer>
              </SpotlightCard>
            )}

            {activeTab === "answers" && (
              <SpotlightCard className="p-6 sm:p-8">
                <div className="mb-6">
                  <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-violet-300/60">Problem solver</p>
                  <h2 className="text-2xl font-bold text-white">Answers from the document</h2>
                </div>
                <MarkdownRenderer>{generatedAnalysis?.answers || ""}</MarkdownRenderer>
              </SpotlightCard>
            )}

            {activeTab === "quiz" && (
              <SpotlightCard className="p-6 sm:p-8">
                <div className="mb-6">
                  <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-amber-300/60">Active recall</p>
                  <h2 className="text-2xl font-bold text-white">Your document quiz</h2>
                </div>
                <MarkdownRenderer>{generatedAnalysis?.quiz || ""}</MarkdownRenderer>
              </SpotlightCard>
            )}

            {activeTab === "chat" && (
              <div className="flex h-[calc(100dvh-180px)] flex-col">
                <div
                  ref={scrollRef}
                  onScroll={updateChatAutoScroll}
                  onTouchMove={pauseAutoScroll}
                  onTouchStart={pauseAutoScroll}
                  onWheel={pauseAutoScroll}
                  className="flex-1 overflow-y-auto overscroll-contain"
                >
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === "user"
                              ? "border border-white/[0.12] bg-white/[0.07] text-white"
                              : "border border-white/[0.08] bg-white/[0.03] text-white/80 backdrop-blur-xl"
                          }`}
                        >
                          {m.role === "assistant" && (
                            <div className="mb-1 text-[0.7rem] font-bold uppercase tracking-wider text-white/35">
                              {streamingMessageId === m.id ? "Thinking…" : "Lanky Doc AI"}
                            </div>
                          )}
                          <MarkdownRenderer>{m.content}</MarkdownRenderer>
                        </div>
                      </div>
                    ))}
                    {loading && !streamingMessageId && (
                      <div className="flex justify-start">
                        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                          <div className="mb-1 text-[0.7rem] font-bold uppercase tracking-wider text-white/35">Thinking…</div>
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

                <div className="mt-4 flex items-end gap-3">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Ask a question about the document..."
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/25 focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-white px-6 text-sm font-bold text-[#030712] transition-all hover:bg-white/90 disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
