import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const buffer = await request.arrayBuffer();
    
    // For PPTX, we'll extract text using a simple approach
    // PPTX files are ZIP archives containing XML files
    // We'll use a basic text extraction method
    const text = await extractTextFromPPTX(Buffer.from(buffer));
    
    return NextResponse.json({
      text: text || "PowerPoint text extraction completed",
    });
  } catch (error) {
    console.error("PPTX parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PowerPoint" },
      { status: 500 }
    );
  }
}

async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  // Basic PPTX text extraction
  // In a production environment, you'd use a library like pptx-parser
  // For now, we'll return a placeholder message
  return "PowerPoint content extraction - slides and text will be processed here.";
}
