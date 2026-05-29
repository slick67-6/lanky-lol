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
const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL?.trim() || "meta/llama-4-maverick-17b-128e-instruct";

const MAX_HISTORY_MESSAGES = 8;
const MAX_IMAGE_DATA_LENGTH = 5_500_000;

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
    const response = await fetch(NVIDIA_INVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: nvidiaMessages,
        max_tokens: 768,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
      }),
    });

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Too many requests, please wait." },
        { status: 429 },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      const message =
        data?.error?.message || data?.message || "Model request failed.";
      throw new Error(message);
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply?.trim()) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: reply.trim() });
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

    return NextResponse.json(
      { error: "The image analyzer could not get a model response. Please try again." },
      { status: 502 },
    );
  }
}
