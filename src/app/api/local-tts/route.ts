import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const VITERBOX_URL = "http://localhost:8000/tts-with-timestamps";
    const NHAT_PHONG_VOICE = "wavs/ElevenLabs_2026-04-23T13_52_31_Nhật-Phong-Narrative-_-Compelling_pvc_sp95_s40_sb35_v3.wav";

    // Hash for caching
    const hash = crypto.createHash("md5").update(text + "nhatphong").digest("hex");
    const fileName = `local_${hash}.mp3`;
    const publicPath = path.join(process.cwd(), "public", "audio-cache");
    const filePath = path.join(publicPath, fileName);
    const publicUrl = `/audio-cache/${fileName}`;

    const response = await fetch(VITERBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: "vi",
        reference_audio_path: NHAT_PHONG_VOICE,
        output_format: "mp3",
        exaggeration: 0.5,
        cfg_weight: 0.5,
        temperature: 0.8,
        sentence_pause: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Viterbox Error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const { audioBase64, subtitles } = data;

    // Save base64 to public folder
    const buffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync(filePath, buffer);
    
    return NextResponse.json({
      url: publicUrl,
      subtitles: subtitles,
    });
  } catch (error: any) {
    console.error("Local TTS Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
