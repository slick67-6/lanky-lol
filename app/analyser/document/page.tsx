"use client";

import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [loadingDetail, setLoadingDetail] = useState("Preparing the extraction pipeline.");
  const [generatedAnalysis, setGeneratedAnalysis] = useState<GeneratedAnalysis | null>(null);
  
  // Chat state
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

  const attachFile = useCallback(async (file: File) => {
    if (!canParseFile(file)) {
      setError("Please upload a PDF, Word document, PowerPoint, or text file.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Please choose a smaller file (max 25MB).");
      return;
    }

    setError(null);
    setPendingFile(file);
  }, []);

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
      if (!response.ok) throw new Error("Failed to parse PDF");
      const data = await response.json();
      return data.text || "PDF content extraction failed";
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
      return data.text || "Word document extraction failed";
    }

    if (fileType.includes("presentation") || fileName.endsWith(".pptx") || fileName.endsWith(".ppt")) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const response = await fetch("/api/parse-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer,
      });
      if (!response.ok) throw new Error("Failed to parse PowerPoint");
      const data = await response.json();
      return data.text || "PowerPoint extraction failed";
    }

    throw new Error("Unsupported file type");
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
    const notes = raw.match(/NOTES:([\s\S]*?)(?:ANSWERS:|QUIZ:|$)/i)?.[1]?.trim();
    const answers = raw.match(/ANSWERS:([\s\S]*?)(?:QUIZ:|$)/i)?.[1]?.trim();
    const quiz = raw.match(/QUIZ:([\s\S]*)/i)?.[1]?.trim();

    return {
      notes: notes || raw || "No notes were generated, but the extracted document preview is available below.",
      answers: answers || "Open the Chat tab to ask targeted questions about this document.",
      quiz: quiz || "Quiz generation was unavailable. Ask the chat to create a custom quiz from the document.",
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
            content: `Analyse this uploaded document named "${fileName}". Return exactly three labelled sections: NOTES:, ANSWERS:, QUIZ:. NOTES should be concise revision notes with headings. ANSWERS should include likely useful Q&A based only on the document. QUIZ should contain 6 questions with answers.`,
            documentContext: content,
          },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error("The AI analysis service could not generate notes right now.");
    }

    return splitGeneratedAnalysis(await readStreamText(res.body));
  };

  const processDocument = async () => {
    if (!pendingFile) return;
    if (loading) return;

    setShowLoadingScreen(true);
    setLoadingProgress(0);
    setLoadingMessage("Reading document...");
    setLoadingDetail("Opening the file and validating the upload.");
    setError(null);

    try {
      setLoadingProgress(10);
      setLoadingMessage("Extracting real document content...");
      setLoadingDetail("Reading text, slide XML, speaker notes, and embedded media metadata where available.");

      const content = await extractDocumentContent(pendingFile);
      setDocumentContent(content);
      setDocumentName(pendingFile.name);

      setLoadingProgress(42);
      setLoadingMessage("Mapping document structure...");
      setLoadingDetail("Chunking extracted content so it can be fed into Lanky AI with the chat context.");

      setLoadingProgress(62);
      setLoadingMessage("Generating notes, answers, and quiz...");
      setLoadingDetail("The AI is now using the extracted document text and metadata, not just the filename.");

      try {
        const analysis = await generateDocumentAnalysis(content, pendingFile.name);
        setGeneratedAnalysis(analysis);
      } catch (analysisError) {
        setGeneratedAnalysis({
          notes: `AI generation could not complete automatically, but extracted text is ready for chat.\n\n${content.slice(0, 1800)}`,
          answers: analysisError instanceof Error ? analysisError.message : "Ask the Chat tab for answers from this document.",
          quiz: "Ask the Chat tab to generate a quiz from the extracted document content.",
        });
      }

      setLoadingProgress(92);
      setLoadingMessage("Finalising your workspace...");
      setLoadingDetail("Saving the extracted context into the analyser tabs and chat.");
      await new Promise(resolve => setTimeout(resolve, 250));
      setLoadingProgress(100);

      setShowLoadingScreen(false);
      setView("analysis");
      setActiveTab("notes");
      setPendingFile(null);

      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I've successfully analyzed "${pendingFile.name}". Navigate through the tabs to view key notes, answers, and quiz questions. Use the Chat tab to ask specific questions about the document.`,
      };
      setMessages([welcomeMessage]);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that document.");
      setShowLoadingScreen(false);
    }
  };

  const closeLoadingScreen = () => {
    setShowLoadingScreen(false);
    setPendingFile(null);
  };

  const goToLanding = () => {
    setView("landing");
    setDocumentContent(null);
    setDocumentName(null);
    setMessages([]);
    setGeneratedAnalysis(null);
    setActiveTab("notes");
  };

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

  if (view === "landing") {
    return (
      <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
        <ParticlesBackground />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <SiteHeader title="AI Document Analyser" />

          <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
            <div className="mx-auto grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="text-center lg:text-left">
              <h1 className="mb-4 font-[family-name:var(--font-syne)] text-3xl font-bold text-cyan-50 sm:text-4xl">
                AI Document Analyser
              </h1>
              <p className="mb-8 text-slate-400 sm:text-lg">
                Upload PDFs, Word documents, PowerPoint presentations, or text files. 
                Extract key insights, get answers, and test your knowledge with AI-generated quizzes.
              </p>

              </div>

              <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-950/75 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
              <div className="mb-8 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-slate-950/50 p-8 transition-colors hover:border-cyan-400/50">
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
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-950/50 text-cyan-300">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-cyan-100">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-400">PDF, DOC, DOCX, PPT, PPTX, TXT (max 25MB)</p>
                  </div>
                </button>
              </div>

              {pendingFile && (
                <div className="mb-6 flex items-center justify-center gap-4 rounded-xl border border-cyan-500/20 bg-slate-950/70 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-500/30 bg-slate-950/50 text-cyan-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-cyan-100 truncate">{pendingFile.name}</p>
                    <p className="text-xs text-slate-400">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="text-sm text-slate-400 hover:text-cyan-300"
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <p className="mb-6 text-sm text-red-400">{error}</p>
              )}

              <button
                onClick={processDocument}
                disabled={!pendingFile || loading}
                className="rounded-xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyse Document
              </button>
              </div>
            </div>
          </main>
        </div>

        {showLoadingScreen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-8 text-center shadow-2xl shadow-cyan-950/30">
              <div className="mb-6 flex justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400"></div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-cyan-100">{loadingMessage}</h3>
              <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-400">{loadingProgress}% complete</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{loadingDetail}</p>
              <button
                onClick={closeLoadingScreen}
                className="mt-6 rounded-xl border border-cyan-500/30 px-6 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-950/40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader title="AI Document Analyser" />

        <div className="border-b border-cyan-500/15 bg-[#030712]/90 px-4 py-2 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button
              onClick={goToLanding}
              className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-950/50 px-3 py-1.5 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-900/50"
            >
              ← Back
            </button>
            <div className="flex-1 truncate text-sm text-slate-400">
              {documentName}
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: "notes" as TabType, label: "Key Notes" },
                { id: "answers" as TabType, label: "Answers" },
                { id: "quiz" as TabType, label: "Quiz" },
                { id: "chat" as TabType, label: "Chat" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-cyan-400 text-cyan-100"
                      : "text-slate-400 hover:text-cyan-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            {activeTab === "notes" && (
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-semibold text-cyan-100">Key Notes</h2>
                {generatedAnalysis?.notes ? (
                  <MarkdownRenderer>{generatedAnalysis.notes}</MarkdownRenderer>
                ) : (
                  <p className="text-slate-300">No notes generated yet.</p>
                )}
                {documentContent && (
                  <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                    <h3 className="mb-2 text-sm font-medium text-cyan-200">Document Preview</h3>
                    <p className="text-sm text-slate-400 line-clamp-10">
                      {documentContent.substring(0, 2000)}...
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "answers" && (
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-semibold text-cyan-100">Answers</h2>
                <MarkdownRenderer>{generatedAnalysis?.answers ?? ""}</MarkdownRenderer>
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-6 backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-semibold text-cyan-100">Quiz</h2>
                <MarkdownRenderer>{generatedAnalysis?.quiz ?? ""}</MarkdownRenderer>
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
                  className="flex-1 overflow-y-auto overscroll-contain [touch-action:pan-y]"
                >
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-2xl ${
                            m.role === "user"
                              ? "border border-cyan-400/25 bg-cyan-500/10 text-cyan-50"
                              : "border border-slate-700/60 bg-slate-950/70 text-slate-200 backdrop-blur-xl"
                          }`}
                        >
                          {m.role === "assistant" && (
                            <div className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                              {streamingMessageId === m.id ? "Thinking live" : "Lanky AI"}
                            </div>
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
                        <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-sm text-slate-400 backdrop-blur-xl">
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
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}

                <div className="mt-4 flex items-end gap-2">
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
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <button
                    onClick={loading ? stopResponse : sendMessage}
                    disabled={!loading && !input.trim()}
                    className={`flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      loading ? "bg-rose-600 hover:bg-rose-500" : "bg-cyan-600 hover:bg-cyan-500"
                    }`}
                  >
                    {loading ? "Stop" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLoadingScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-8 text-center shadow-2xl shadow-cyan-950/30">
            <div className="mb-6 flex justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400"></div>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-cyan-100">{loadingMessage}</h3>
            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-400">{loadingProgress}% complete</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{loadingDetail}</p>
            <button
              onClick={closeLoadingScreen}
              className="mt-6 rounded-xl border border-cyan-500/30 px-6 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-950/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
