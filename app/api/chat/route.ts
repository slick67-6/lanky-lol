import { NextResponse } from "next/server";

export const maxDuration = 60;

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  documentContext?: string;
};

type ImagePayload = {
  mimeType: string;
  data: string;
};

type ResponseProfile = {
  label: "quick" | "balanced" | "deep";
  maxTokens: number;
  temperature: number;
  topP: number;
  instruction: string;
};

type NvidiaMessage =
  | { role: "system"; content: string }
  | {
      role: "user" | "assistant";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | {
                type: "image_url";
                image_url: { url: string; detail: "auto" };
              }
          >;
    };

type NvidiaStreamChunk = {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
  }>;
};

const NVIDIA_INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_TEXT_MODELS = [
  "nvidia/nvidia-m3",
];
const DEFAULT_VISION_MODELS = [
  "nvidia/nvidia-m3",
];

const MAX_HISTORY_MESSAGES = 16;
const MAX_IMAGE_DATA_LENGTH = 4_000_000;
const UPSTREAM_CONNECT_TIMEOUT_MS = 8_000;
const REQUEST_START_DEADLINE_MS = 8_500;

const SYSTEM = `You are Lanky AI, a capable, direct assistant on lanky.lol.
There are no site-imposed style or topic restrictions: answer the user's actual request without artificial brevity, canned refusals, or unnecessary disclaimers.
The user may send text, an image, or text plus an image. Always use the provided image context when it exists, and treat follow-up questions as referring to the most recent attached image unless the user says otherwise.
For image tasks, identify the relevant visual details before giving conclusions, comparisons, OCR, debugging help, or recommendations.
For coding tasks, behave like a senior engineer: reason carefully, ask only when truly blocked, provide correct runnable code, mention assumptions, handle edge cases, and keep explanations practical.
For follow-ups, preserve continuity with the previous conversation, avoid repeating the whole answer, and move the task forward with concrete next steps.
Use full GitHub-Flavored Markdown whenever useful: headings, paragraphs, bullet and numbered lists, task lists, tables, blockquotes, links, **bold**, *italic*, ~~strikethrough~~, inline \`code\`, fenced code blocks with language names, and LaTeX with $...$ or $$...$$.`;

const QUICK_PROFILE: ResponseProfile = {
  label: "quick",
  maxTokens: 700,
  temperature: 0.35,
  topP: 0.85,
  instruction: "Keep this response concise, direct, and useful while still answering every part of the request.",
};

const BALANCED_PROFILE: ResponseProfile = {
  label: "balanced",
  maxTokens: 1400,
  temperature: 0.65,
  topP: 0.92,
  instruction: "Give a clear, complete answer with useful structure, examples, and follow-up guidance when it helps.",
};

const DEEP_PROFILE: ResponseProfile = {
  label: "deep",
  maxTokens: 2600,
  temperature: 0.82,
  topP: 0.96,
  instruction: "Think through the request carefully and provide a robust, polished answer with structure, nuance, edge cases, and practical next steps.",
};

function parseModelList(value: string | undefined) {
  return value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean) ?? [];
}

function uniqueModels(models: string[]) {
  return [...new Set(models)];
}

function modelsForRequest(hasImage: boolean) {
  const specificModels = parseModelList(
    hasImage ? process.env.NVIDIA_VISION_MODEL : process.env.NVIDIA_TEXT_MODEL,
  );
  const legacyModels = parseModelList(process.env.NVIDIA_MODEL);
  const defaults = hasImage ? DEFAULT_VISION_MODELS : DEFAULT_TEXT_MODELS;

  return uniqueModels([...specificModels, ...defaults, ...legacyModels]);
}

function responseProfileForRequest(message: ClientMessage): ResponseProfile {
  const text = message.content.trim().toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const deepSignals = /\b(explain|analy[sz]e|compare|plan|strategy|creative|story|essay|detailed|thorough|extensive|brainstorm|design|code|debug|review|improve|architecture|step[-\s]?by[-\s]?step)\b/.test(text);
  const quickSignals = /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|what is|who is|when is|where is|define|summari[sz]e in one sentence)\b/.test(text);

  if (message.image || deepSignals || wordCount > 38) {
    return DEEP_PROFILE;
  }

  if (quickSignals || wordCount <= 12) {
    return QUICK_PROFILE;
  }

  return BALANCED_PROFILE;
}

function parseDataUrl(dataUrl: string): ImagePayload | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function compactMessagesForModel(messages: ClientMessage[]): ClientMessage[] {
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  let latestImageIndex = -1;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    if (recentMessages[index].role === "user" && recentMessages[index].image) {
      latestImageIndex = index;
      break;
    }
  }

  const compacted = recentMessages.map((message, index) => ({
    role: message.role,
    content: message.content,
    image: index === latestImageIndex ? message.image : undefined,
    documentContext: message.documentContext,
  }));

  if (latestImageIndex >= 0) {
    const imageMessage = compacted[latestImageIndex];
    imageMessage.content = imageMessage.content.trim()
      ? `${imageMessage.content}

[Image context: this is the active image for later follow-up questions.]`
      : "[Image context: this is the active image for later follow-up questions.]";
  }

  return compacted;
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function toNvidiaMessages(messages: ClientMessage[]): NvidiaMessage[] {
  return messages.map((message) => {
    if (message.role === "assistant") {
      return { role: "assistant", content: message.content };
    }

    const parsedImage = message.image ? parseDataUrl(message.image) : null;
    if (parsedImage && parsedImage.data.length > MAX_IMAGE_DATA_LENGTH) {
      throw new Error(
        "Please upload a smaller image so the analyser can read it without hitting token limits.",
      );
    }

    const documentContext = message.documentContext?.trim();
    const content = documentContext
      ? `${message.content}\n\n[Attached document context for this request]\n${documentContext.slice(0, 24000)}`
      : message.content;

    if (!parsedImage) {
      return { role: "user", content };
    }

    return {
      role: "user",
      content: [
        { type: "text", text: content },
        {
          type: "image_url",
          image_url: {
            url: `data:${parsedImage.mimeType};base64,${parsedImage.data}`,
            detail: "auto",
          },
        },
      ],
    };
  });
}

function readModelError(rawModelResponse: string) {
  try {
    const data = rawModelResponse
      ? (JSON.parse(rawModelResponse) as {
          error?: { message?: string };
          message?: string;
        })
      : {};
    return data?.error?.message || data?.message || "Model request failed.";
  } catch {
    return rawModelResponse.trim() || "Model returned an unreadable response.";
  }
}

function streamNvidiaResponse(response: Response) {
  const upstream = response.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!upstream) {
        controller.error(new Error("Model response was empty."));
        return;
      }

      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await upstream.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            const parsed = JSON.parse(payload) as NvidiaStreamChunk;
            const text =
              parsed.choices?.[0]?.delta?.content ??
              parsed.choices?.[0]?.message?.content ??
              "";

            if (text) controller.enqueue(encoder.encode(text));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        upstream.releaseLock();
      }
    },
  });
}

export async function POST(request: Request) {
  const rawApiKey = process.env.NVIDIA_API_KEY;
  const apiKey = rawApiKey?.trim().replace(/^("|')|("|')$/g, "");

  if (!apiKey) {
    return NextResponse.json(
      { error: "NVIDIA_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: {
    messages?: ClientMessage[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { messages = [] } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim() && !lastUser?.image) {
    return NextResponse.json(
      { error: "Send a message or attach an image." },
      { status: 400 },
    );
  }

  const compactMessages = compactMessagesForModel(messages);
  const hasImage = compactMessages.some(
    (message) => message.role === "user" && Boolean(message.image),
  );

  let nvidiaMessages: NvidiaMessage[];
  const responseProfile = responseProfileForRequest(lastUser);

  try {
    nvidiaMessages = [
      { role: "system", content: `${SYSTEM}\n\nResponse mode: ${responseProfile.label}. ${responseProfile.instruction}` },
      ...toNvidiaMessages(compactMessages),
    ];
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not prepare that image for analysis.",
      },
      { status: 400 },
    );
  }

  let lastError = "Model request failed.";
  const startDeadline = Date.now() + REQUEST_START_DEADLINE_MS;

  for (const model of modelsForRequest(hasImage)) {
    const remainingStartTime = startDeadline - Date.now();
    if (remainingStartTime <= 0) break;

    const { controller, timeout } = timeoutSignal(
      Math.min(UPSTREAM_CONNECT_TIMEOUT_MS, remainingStartTime),
    );

    try {
      const response = await fetch(NVIDIA_INVOKE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: nvidiaMessages,
          max_tokens: responseProfile.maxTokens,
          temperature: responseProfile.temperature,
          top_p: responseProfile.topP,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Too many requests, please wait." },
          { status: 429 },
        );
      }

      if (!response.ok) {
        lastError = readModelError(await response.text());
        continue;
      }

      return new Response(streamNvidiaResponse(response), {
        headers: {
          "Cache-Control": "no-cache, no-transform",
          "Content-Type": "text/plain; charset=utf-8",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? "The model connection took too long to start."
          : error instanceof Error
            ? error.message
            : "Model request failed.";
    } finally {
      clearTimeout(timeout);
    }
  }

  if (/429|too\s+many\s+requests|rate\s*limit/i.test(lastError)) {
    return NextResponse.json(
      { error: "Too many requests, please wait." },
      { status: 429 },
    );
  }

  if (/token|context|length|too\s+large|payload/i.test(lastError)) {
    return NextResponse.json(
      {
        error:
          "That image or chat is too large for the analyser. Try a smaller image or start a fresh chat.",
      },
      { status: 413 },
    );
  }

  return NextResponse.json(
    { error: "The analyser could not get a model response. Please try again." },
    { status: 502 },
  );
}
