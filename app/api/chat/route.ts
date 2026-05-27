import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

type ImagePayload = {
  mimeType: string;
  data: string;
};

const SYSTEM = `You are a capable AI assistant on lanky.lol with strong vision and reasoning skills.
When the user sends an image, analyse it thoroughly: describe what you see, answer their questions, read visible text, and give practical insights.
When they send only text, respond helpfully and conversationally like a modern LLM — do not echo or repeat their message back.
Be concise unless they ask for detail. Stay safe and refuse harmful requests.`;

function parseDataUrl(dataUrl: string): ImagePayload | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(request: Request) {
  const rawApiKey = process.env.GEMINI_API_KEY;
  const apiKey = rawApiKey?.trim().replace(/^(["'])|(["'])$/g, "");

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }


  let body: {
    messages?: ClientMessage[];
    image?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { messages = [], image } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 },
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim() && !image) {
    return NextResponse.json(
      { error: "Send a message or attach an image." },
      { status: 400 },
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  const parts: Array<{ text: string } | { inlineData: ImagePayload }> = [];
  const text = lastUser?.content?.trim() || "Analyse this image in detail.";
  parts.push({ text });

  if (image) {
    const parsed = parseDataUrl(image);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid image data." },
        { status: 400 },
      );
    }
    parts.push({ inlineData: parsed });
  }

  try {
    const result = await chat.sendMessage(parts);
    const reply = result.response.text();
    if (!reply?.trim()) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Model request failed.";

    if (/429|too\s+many\s+requests|rate\s*limit/i.test(message)) {
      return NextResponse.json(
        { error: "Too many requests, please wait." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
