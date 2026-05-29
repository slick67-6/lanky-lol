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

const NVIDIA_INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_NVIDIA_MODELS = [
  "meta/llama-4-scout-17b-16e-instruct",
  "meta/llama-4-maverick-17b-128e-instruct",
];
const NVIDIA_MODELS = (process.env.NVIDIA_MODEL?.trim()
  ? process.env.NVIDIA_MODEL.split(",")
  : DEFAULT_NVIDIA_MODELS
)
  .map((model) => model.trim())
  .filter(Boolean);

const MAX_HISTORY_MESSAGES = 8;
const MAX_IMAGE_DATA_LENGTH = 4_000_000;
const MODEL_TIMEOUT_MS = 24_000;

const SYSTEM = `You are a capable AI assistant on lanky.lol.
Respond naturally with your own style and level of detail based on the user's intent.
When an image is attached, describe what you can see first, then answer the user's request.
Stay safe and refuse harmful requests.`;

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
      throw new Error("Please upload a smaller image so the analyzer can read it without hitting token limits.");
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

export async function POST(request: Request) {
  const rawApiKey = process.env.NVIDIA_API_KEY;
  const apiKey = rawApiKey?.trim().replace(/^("'])|(["'])$/g, "");

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

  let nvidiaMessages: NvidiaMessage[];

  try {
    nvidiaMessages = [
      { role: "system", content: SYSTEM },
      ...toNvidiaMessages(compactMessagesForModel(messages)),
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

  try {
    let lastError = "Model request failed.";

    for (const model of NVIDIA_MODELS) {
      const { controller, timeout } = timeoutSignal(MODEL_TIMEOUT_MS);

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
            max_tokens: 800,
            temperature: 0.7,
            top_p: 0.95,
            stream: false,
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          return NextResponse.json(
            { error: "Too many requests, please wait." },
            { status: 429 },
          );
        }

        const rawModelResponse = await response.text();
        let data: {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
          message?: string;
        } = {};

        try {
          data = rawModelResponse ? JSON.parse(rawModelResponse) : {};
        } catch {
          throw new Error(rawModelResponse.trim() || "Model returned an unreadable response.");
        }

        if (!response.ok) {
          const message =
            data?.error?.message || data?.message || "Model request failed.";
          throw new Error(message);
        }

        const reply = data?.choices?.[0]?.message?.content;
        if (!reply?.trim()) {
          throw new Error("Empty response from model.");
        }

        return NextResponse.json({ reply: reply.trim() });
      } catch (error) {
        lastError =
          error instanceof Error && error.name === "AbortError"
            ? "The model took too long to respond."
            : error instanceof Error
              ? error.message
              : "Model request failed.";
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(lastError);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model request failed.";

    if (/429|too\s+many\s+requests|rate\s*limit/i.test(message)) {
      return NextResponse.json(
        { error: "Too many requests, please wait." },
        { status: 429 },
      );
    }

    if (/token|context|length|too\s+large|payload/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "That image or chat is too large for the analyzer. Try a smaller image or start a fresh chat.",
        },
        { status: 413 },
      );
    }

    if (/timed?\s*out|too\s+long|abort/i.test(message)) {
      return NextResponse.json(
        { error: "The model is taking too long right now. Try again with a shorter prompt or smaller image." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "The image analyzer could not get a model response. Please try again." },
      { status: 502 },
    );
  }
}
