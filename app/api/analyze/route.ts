import { NextResponse } from "next/server";

const MODES = {
  describe:
    "Describe this image in rich detail: setting, colors, mood, and what is happening.",
  objects:
    "List every notable object, person, animal, and visual element in this image as a clear bullet list.",
  text: "Extract and transcribe all visible text in this image. If there is no text, say so.",
  accessibility:
    "Write concise accessibility alt text for this image so a blind user understands it.",
} as const;

type Mode = keyof typeof MODES;

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VENICE_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: { image?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, mode } = body;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Missing image data." }, { status: 400 });
  }

  const prompt =
    mode && mode in MODES ? MODES[mode as Mode] : MODES.describe;

  const veniceResponse = await fetch(
    "https://api.venice.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-vl-235b-a22b",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    },
  );

  if (!veniceResponse.ok) {
    const detail = await veniceResponse.text();
    return NextResponse.json(
      { error: detail || "Venice API request failed." },
      { status: veniceResponse.status },
    );
  }

  const data = (await veniceResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const analysis = data.choices?.[0]?.message?.content?.trim();
  if (!analysis) {
    return NextResponse.json(
      { error: "No analysis returned from the model." },
      { status: 502 },
    );
  }

  return NextResponse.json({ analysis });
}
