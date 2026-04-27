import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { videoSpec } = await req.json();

    if (!videoSpec) {
      return NextResponse.json({ error: "Video spec is required" }, { status: 400 });
    }

    console.log("Starting render for:", videoSpec.templateId);

    // 1. Path to Remotion Root
    const entry = path.join(process.cwd(), "src/remotion/Root.tsx");
    
    // 2. Bundle the project
    const bundleLocation = await bundle(entry);

    // Process videoSpec to make relative URLs absolute so the renderer can fetch them
    const baseUrl = req.nextUrl.origin;
    const processedSpec = JSON.parse(JSON.stringify(videoSpec));
    if (processedSpec.scenes) {
      processedSpec.scenes.forEach((scene: any) => {
        if (scene.audioUrl && scene.audioUrl.startsWith('/')) {
          scene.audioUrl = `${baseUrl}${scene.audioUrl}`;
        }
        if (scene.imageUrl && scene.imageUrl.startsWith('/')) {
          scene.imageUrl = `${baseUrl}${scene.imageUrl}`;
        }
      });
    }

    // 3. Select the composition
    const compositionId = processedSpec.templateId === "technical" ? "Technical" : "ShareNews";
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: processedSpec,
    });

    // CRITICAL: Override the default duration (150) with the actual duration from the spec
    if (processedSpec.durationInFrames) {
      composition.durationInFrames = processedSpec.durationInFrames;
    }

    // 4. Create output path
    const outputDir = path.join(process.cwd(), "public", "renders");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFileName = `render-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);
    const publicUrl = `/renders/${outputFileName}`;

    // 5. Render
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: processedSpec,
    });

    console.log("Render finished:", outputPath);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Render Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
