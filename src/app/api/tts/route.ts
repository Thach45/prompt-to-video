import { UniversalEdgeTTS } from "edge-tts-universal";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { text, voice = "vi-VN-HoaiMyNeural" } = await request.json();

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    // Create a hash of text and voice to avoid redundant generation
    const hash = crypto.createHash("md5").update(text + voice).digest("hex");
    const fileName = `${hash}.mp3`;
    const publicPath = path.join(process.cwd(), "public", "audio-cache");
    const filePath = path.join(publicPath, fileName);
    const publicUrl = `/audio-cache/${fileName}`;

    // Ensure directory exists
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }

    const tts = new UniversalEdgeTTS(text, voice);
    const result = await tts.synthesize();

    // Save to public folder
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return Response.json({
      url: publicUrl,
      subtitles: result.subtitle,
    });
  } catch (error) {
    console.error("TTS Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
