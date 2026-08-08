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
};

type TabType = "notes" | "answers" | "quiz" | "chat";
type ViewType = "landing" | "analysis";
type GeneratedAnalysis = { notes: string; answers: string; quiz: string };

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function canParseFile(file: File) {
  const supportedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ];
  return supportedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|ppt|pptx|txt)$/i);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsArrayBuffer(file);
  });
}

export default function DocumentAnalyserPage() {
  const [view, setView] = useState<ViewType>("landing");
  const [activeTab, setActiveTab] = useState<TabType>("notes");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
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
        showToast("Please upload a PDF, Word, PowerPoint, or text file.", "error");
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        showToast("File exceeds 25MB limit.", "error");
        return;
      }

      setError(null);
      setPendingFile(file);
      showToast(`Selected "${file.name}"`, "info");
    },
    [showToast]
  );

  const extractDocumentContent = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      return await readFileAsText(file);
    }

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer,
      });
      if (!response.ok) throw new Error("Failed to parse PDF document");
      const data = await response.json();
      return data.text || "PDF content extraction complete.";
    }

    if (fileType.includes("word") || fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const response = await fetch("/api/parse-docx", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer,
      });
      if (!response.ok) throw new Error("Failed to parse Word document");
      const data = await response.json();
      return data.text || "Word document extraction complete.";
    }

    if (fileType.includes("presentation") || fileName.endsWith(".pptx") || fileName.endsWith(".ppt")) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const response = await fetch("/api/parse-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer,
      });
      if (!response.ok) throw new Error("Failed to parse PowerPoint presentation");
      const data = await response.json();
      return data.text || "PowerPoint extraction complete.";
    }

    throw new Error("Unsupported file format");
  };

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

  const generateDocumentAnalysis = async (content: string, fileName: string) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Analyse document "${fileName}". Return three labelled sections: NOTES:, ANSWERS:, QUIZ:. NOTES should be concise bullet points. ANSWERS should have Q&A pairs. QUIZ should have 6 questions with answers.`,
            documentContext: content,
          },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error("AI analysis service unavailable.");
    }

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
      setLoadingMessage("Extracting document text...");
      const content = await extractDocumentContent(pendingFile);
      setDocumentContent(content);
      setDocumentName(pendingFile.name);

      setLoadingProgress(70);
      setLoadingMessage("Generating AI notes & quiz...");

      try {
        const analysis = await generateDocumentAnalysis(content, pendingFile.name);
        setGeneratedAnalysis(analysis);
      } catch {
        setGeneratedAnalysis({
          notes: `Document text extracted successfully.\n\n${content.slice(0, 1800)}...`,
          answers: "Use the Chat tab for document Q&A.",
          quiz: "Ask the Chat tab to generate a quiz.",
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
          content: `Successfully analyzed **${pendingFile.name}**. Explore key notes, Q&A answers, and custom quizzes using the top tabs or ask me directly here!`,
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

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
      }

      reply += decoder.decode();
      if (!reply.trim()) throw new Error("Empty response from document model.");
      setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: reply.trim() }]);
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
      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
        documentContext: documentContent,
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
                  Upload PDFs, Word docs, PowerPoint presentations, or raw text files. Instantly extract study notes, Q&A sets, and custom quizzes.
                </p>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-6 rounded-2xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center transition-colors hover:border-white/[0.2]">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
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
                      <p className="text-xs text-slate-400">PDF, DOCX, PPTX, TXT (Max 25MB)</p>
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

                <button
                  onClick={processDocument}
                  disabled={!pendingFile || loading}
                  className="w-full rounded-2xl bg-white py-3.5 text-base font-bold text-[#030712] shadow-[0_2px_16px_rgba(255,255,255,0.15)] transition-all hover:bg-white/90 disabled:opacity-40"
                >
                  Analyse Document
                </button>
              </div>
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

            <div className="flex gap-1">
              {[
                { id: "notes" as TabType, label: "Notes" },
                { id: "answers" as TabType, label: "Q&A" },
                { id: "quiz" as TabType, label: "Quiz" },
                { id: "chat" as TabType, label: "Chat" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-[#030712]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.07]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Workspace Views */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-5xl">
            {activeTab === "notes" && (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-bold text-white/80">Key Study Notes</h2>
                <MarkdownRenderer>{generatedAnalysis?.notes || ""}</MarkdownRenderer>
              </div>
            )}

            {activeTab === "answers" && (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-bold text-white/80">Q&amp;A Insights</h2>
                <MarkdownRenderer>{generatedAnalysis?.answers || ""}</MarkdownRenderer>
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-bold text-white/80">Generated Quiz</h2>
                <MarkdownRenderer>{generatedAnalysis?.quiz || ""}</MarkdownRenderer>
              </div>
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
