import { readFile } from "node:fs/promises";
import { join } from "node:path";

const AUDIO_FILE_PATH = join(process.cwd(), "tiki-tiki-slowed.mp3");

export async function GET() {
  const audioFile = await readFile(AUDIO_FILE_PATH);

  return new Response(audioFile, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": audioFile.byteLength.toString(),
      "Content-Type": "audio/mpeg",
    },
  });
}
