import { NextResponse } from "next/server";

export const maxDuration = 10;

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

type NvidiaChatMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "auto" } }
          >;
    };

type NvidiaChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
  message?: string;
  request_id?: string;
  id?: string;
};

const NVIDIA_INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_STATUS_URL = "https://integrate.api.nvidia.com/v1/status";
const DEFAULT_NVIDIA_MODEL = "nvidia/llama-3.1-nemotron-nano-vl-8b-v1";

const MODEL_TIMEOUT_MS = 7_500;
const STATUS_POLL_DELAY_MS = 700;
const MAX_IMAGE_BASE64_CHARS = 4_500_000;
const MAX_PROMPT_CHARS = 2_000;

const SYSTEM_PROMPT = `You are a fast, helpful AI image analyzer for lanky.lol.
If an image is attached, first say what you can see, then answer the user's request.
Keep answers useful but concise unless the user asks for detail.`;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function getApiKey() {
  return process.env.NVIDIA_API_KEY?.trim().replace(/^(["'])|(["'])$/g, "");
}

function getModel() {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

function getLastUserMessage(messages: ClientMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user");
}

function readDataUrl(dataUrl?: string) {
  if (!dataUrl) return null;

  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function getAbortSignal(timeoutMs: number) {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function getProviderErrorMessage(data: NvidiaChatResponse) {
  if (typeof data.error === "string") return data.error;
  return data.error?.message || data.message || "Model request failed.";
}

async function parseProviderResponse(response: Response) {
  const raw = await response.text();

  try {
    return raw ? (JSON.parse(raw) as NvidiaChatResponse) : {};
  } catch {
    throw new Error(raw.trim() || "Model returned an unreadable response.");
  }
}

function toNvidiaMessages(message: ClientMessage): NvidiaChatMessage[] {
  const text = (message.content || "What is in this image?")
    .trim()
    .slice(0, MAX_PROMPT_CHARS);
  const image = readDataUrl(message.image);

  if (!image) {
    return [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ];
  }

  if (image.data.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error("Please upload a smaller image so the analyzer can respond quickly.");
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text },
        {
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.data}`,
            detail: "auto",
          },
        },
      ],
    },
  ];
}

async function requestNvidia(messages: NvidiaChatMessage[], apiKey: string) {
  const response = await fetch(NVIDIA_INVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: 700,
      temperature: 0.35,
      top_p: 0.9,
      stream: false,
    }),
    signal: getAbortSignal(MODEL_TIMEOUT_MS),
  });

  const data = await parseProviderResponse(response);

  if (response.status === 202) {
    const requestId = data.request_id || data.id;
    if (!requestId) return data;

    await new Promise((resolve) => setTimeout(resolve, STATUS_POLL_DELAY_MS));

    const statusResponse = await fetch(`${NVIDIA_STATUS_URL}/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: getAbortSignal(MODEL_TIMEOUT_MS),
    });

    return parseProviderResponse(statusResponse);
  }

  if (!response.ok) {
    throw new Error(getProviderErrorMessage(data));
  }

  return data;
}

export async function POST(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return jsonError("NVIDIA_API_KEY is not configured on the server.", 500);
  }

  let messages: ClientMessage[];

  try {
    const body = (await request.json()) as { messages?: ClientMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const lastUser = getLastUserMessage(messages);
  if (!lastUser?.content?.trim() && !lastUser?.image) {
    return jsonError("Send a message or attach an image.", 400);
  }

  let nvidiaMessages: NvidiaChatMessage[];
  try {
    nvidiaMessages = toNvidiaMessages(lastUser);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not prepare that image.",
      400,
    );
  }

  try {
    const data = await requestNvidia(nvidiaMessages, apiKey);
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return jsonError("The image analyzer did not receive a reply. Please try again.", 502);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if (isTimeoutError(error)) {
      return jsonError(
        "The image analyzer took too long to respond. Try a smaller image or a shorter question.",
        504,
      );
    }

    const message = error instanceof Error ? error.message : "Model request failed.";

    if (/429|too\s+many\s+requests|rate\s*limit/i.test(message)) {
      return jsonError("Too many requests, please wait.", 429);
    }

    if (/token|context|length|too\s+large|payload|image/i.test(message)) {
      return jsonError(
        "That image or message is too large for the analyzer. Try a smaller image or shorter question.",
        413,
      );
    }

    return jsonError(
      "The image analyzer could not get a model response. Please try again.",
      502,
    );
  }
}
