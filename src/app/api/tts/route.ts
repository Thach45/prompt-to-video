import { UniversalEdgeTTS } from "edge-tts-universal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { text, voice = "vi-VN-HoaiMyNeural" } = await request.json();

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const tts = new UniversalEdgeTTS(text, voice);
    const result = await tts.synthesize();

    const arrayBuffer = await result.audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    return Response.json({
      audioBase64: base64Audio,
      subtitles: result.subtitle,
    });
  } catch (error) {
    console.error("TTS Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
