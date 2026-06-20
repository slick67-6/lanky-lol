import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(value: string) {
  return decodeXmlText(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export async function POST(request: NextRequest) {
  try {
    const buffer = await request.arrayBuffer();
    const zip = await JSZip.loadAsync(Buffer.from(buffer));
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] ?? 0) - Number(b.match(/slide(\d+)/)?.[1] ?? 0));

    const slides: Array<{ slide: number; text: string; images: string[] }> = [];

    for (const fileName of slideFiles) {
      const xml = await zip.files[fileName].async("string");
      const textMatches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => decodeXmlText(match[1]));
      const altMatches = [...xml.matchAll(/descr="([^"]+)"/g)].map((match) => decodeXmlText(match[1]));
      const imageRefs = [...xml.matchAll(/<a:blip[^>]+r:embed="([^"]+)"/g)].map((match) => match[1]);
      const slideNumber = Number(fileName.match(/slide(\d+)/)?.[1] ?? slides.length + 1);
      slides.push({
        slide: slideNumber,
        text: [...textMatches, ...altMatches].filter(Boolean).join("\n"),
        images: imageRefs,
      });
    }

    const notes = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
        .sort()
        .map(async (name) => stripXmlTags(await zip.files[name].async("string"))),
    );

    const text = slides
      .map((slide) => [`Slide ${slide.slide}:`, slide.text || "[No visible slide text extracted]", slide.images.length ? `[Images on slide: ${slide.images.length}]` : ""].filter(Boolean).join("\n"))
      .join("\n\n");

    return NextResponse.json({
      text: [text, notes.length ? `Speaker notes:\n${notes.join("\n\n")}` : ""].filter(Boolean).join("\n\n"),
      slideCount: slides.length,
      imageCount: slides.reduce((total, slide) => total + slide.images.length, 0),
    });
  } catch (error) {
    console.error("PPTX parsing error:", error);
    return NextResponse.json({ error: "Failed to parse PowerPoint" }, { status: 500 });
  }
}
