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

    return new Response(result.audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
