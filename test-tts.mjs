import { UniversalEdgeTTS } from "edge-tts-universal";
import fs from "fs";

async function test() {
  console.log("Starting synthesis...");
  const tts = new UniversalEdgeTTS("Xin chào, đây là bài kiểm tra.", "vi-VN-HoaiMyNeural");
  const audioData = await tts.synthesize();
  console.log("Type of audioData:", typeof audioData);
  console.log("Is Buffer:", Buffer.isBuffer(audioData));
  if (audioData instanceof Uint8Array) {
    console.log("Length:", audioData.length);
    fs.writeFileSync("test.mp3", audioData);
    console.log("Saved to test.mp3");
  } else {
    console.log(audioData);
  }
}
test().catch(console.error);
