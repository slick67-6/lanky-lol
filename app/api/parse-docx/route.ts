import mammoth from "mammoth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    const [rawText, html] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }, {
        convertImage: mammoth.images.imgElement((image) =>
          image.read("base64").then((data) => ({
            src: `data:${image.contentType};base64,${data}`,
            alt: `Embedded ${image.contentType} image`,
          })),
        ),
      }),
    ]);

    const imageCount = (html.value.match(/<img\b/g) ?? []).length;
    const imageSummary = imageCount
      ? `\n\n[Document media: ${imageCount} embedded image${imageCount === 1 ? "" : "s"} detected. The analyser can use surrounding captions/alt text; visual OCR is not available for DOCX images yet.]`
      : "";

    return NextResponse.json({
      text: `${rawText.value}${imageSummary}`.trim(),
      html: html.value,
      imageCount,
      messages: [...rawText.messages, ...html.messages].map((message) => message.message),
    });
  } catch (error) {
    console.error("DOCX parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse Word document" },
      { status: 500 },
    );
  }
}
