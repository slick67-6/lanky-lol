import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const buffer = await request.arrayBuffer();
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    
    return NextResponse.json({
      text: result.value,
    });
  } catch (error) {
    console.error("DOCX parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse Word document" },
      { status: 500 }
    );
  }
}
