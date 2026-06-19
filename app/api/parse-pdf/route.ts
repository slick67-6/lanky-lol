import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(request: NextRequest) {
  try {
    const buffer = await request.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));
    
    return NextResponse.json({
      text: data.text,
      numPages: data.numpages,
    });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
