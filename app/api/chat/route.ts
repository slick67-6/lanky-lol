import { NextResponse } from "next/server";

export const maxDuration = 60;

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

type ImagePayload = {
  mimeType: string;
  data: string;
};

type ResponseProfile = {
  label: "short" | "standard" | "extended";
  maxTokens: number;
  temperature: number;
  topP: number;
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
  "nvidia/llama-3.1-nemotron-nano-8b-v1",
  "meta/llama-3.1-8b-instruct",
];
const DEFAULT_VISION_MODELS = [
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
  "meta/llama-4-scout-17b-16e-instruct",
  "meta/llama-4-maverick-17b-128e-instruct",
];

const MAX_HISTORY_MESSAGES = 8;
const MAX_IMAGE_DATA_LENGTH = 4_000_000;
const UPSTREAM_CONNECT_TIMEOUT_MS = 8_000;
const REQUEST_START_DEADLINE_MS = 8_500;

const SYSTEM = `You are a capable AI assistant on lanky.lol.
Reply naturally to the user, using the text, image, or both when provided.
Decide for yourself how brief or deep the answer should be from the user's actual request.
Use clear Markdown when useful: headings, bullets, numbered lists with increasing numbers, tables, links, code blocks, and LaTeX-style math with $...$, \\(...\\), $$...$$, or \\[...\\].`;

const SHORT_PROFILE: ResponseProfile = {
  label: "short",
  maxTokens: 700,
  temperature: 0.45,
  topP: 0.9,
};

const STANDARD_PROFILE: ResponseProfile = {
  label: "standard",
  maxTokens: 1400,
  temperature: 0.62,
  topP: 0.94,
};

const EXTENDED_PROFILE: ResponseProfile = {
  label: "extended",
  maxTokens: 3000,
  temperature: 0.7,
  topP: 0.96,
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
  const text = message.content.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const questionCount = text.split("?").length - 1;
  const lineCount = text.split("\n").filter((line) => line.trim()).length;
  const hasStructuredInput = /```|\n\s*[-*]\s+|\n\s*\d+[.)]\s+|\|.+\|/.test(text);
  const hasDenseSymbols = /[=<>^{}()[\]$]/.test(text);
  const complexityScore =
    (message.image ? 2 : 0) +
    (wordCount > 28 ? 1 : 0) +
    (wordCount > 80 ? 2 : 0) +
    (questionCount > 1 ? 1 : 0) +
    (lineCount > 3 ? 1 : 0) +
    (hasStructuredInput ? 2 : 0) +
    (hasDenseSymbols ? 1 : 0);

  if (complexityScore >= 4) {
    return EXTENDED_PROFILE;
  }

  if (complexityScore >= 1 || wordCount > 14) {
    return STANDARD_PROFILE;
  }

  return SHORT_PROFILE;
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

  return recentMessages.map((message, index) => ({
    role: message.role,
    content: message.content,
    image: index === latestImageIndex ? message.image : undefined,
  }));
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

    if (!parsedImage) {
      return { role: "user", content: message.content };
    }

    return {
      role: "user",
      content: [
        { type: "text", text: message.content },
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
      { role: "system", content: SYSTEM },
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
