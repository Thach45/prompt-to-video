import { GoogleGenAI } from "@google/genai";
import { clampVideoSpec, defaultVideoSpec } from "@/lib/video-spec";

type GenerateRequest = {
  prompt?: string;
  templateId?: "share-news" | "technical";
};

export const runtime = "nodejs";

const extractSecondsFromPrompt = (prompt: string): number | null => {
  const lowerPrompt = prompt.toLowerCase();

  const secondMatch = lowerPrompt.match(/(\d+(?:[.,]\d+)?)\s*(gi[aâ]y|s|sec|seconds?)/i);
  if (secondMatch?.[1]) {
    const value = Number.parseFloat(secondMatch[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }

  const minuteMatch = lowerPrompt.match(/(\d+(?:[.,]\d+)?)\s*(ph[uú]t|m|mins?|minutes?)/i);
  if (minuteMatch?.[1]) {
    const value = Number.parseFloat(minuteMatch[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      return Math.round(value * 60);
    }
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const prompt = body.prompt?.trim();
    const forcedTemplateId =
      body.templateId === "technical" || body.templateId === "share-news"
        ? body.templateId
        : undefined;

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY in environment variables." },
        { status: 500 },
      );
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });
    const encoder = new TextEncoder();

    const sseHeaders = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    };

    const sendEvent = (type: string, payload: unknown) =>
      encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);

    const systemPrompt = [
      "You are a creative director for prompt-to-video product UI.",
      "Output language must be Vietnamese (Tieng Viet) for all human-readable content.",
      "Important: Keep technical terms, product names, brand names, and common industry keywords in original English when appropriate.",
      "Do not force-translate terms like AI, API, machine learning, prompt, video, CTA, brand names, or framework/tool names.",
      "Return one strict JSON object only with these exact keys:",
      "templateId, title, subtitle, accent, cta, fps, width, height, scenes, backgroundImage, icon, animationType, backgroundColor, showGrid, showGradient, stats.",
      "Rules:",
      '- templateId must be one of: "share-news", "technical".',
      '- Choose templateId by content intent: use "technical" for engineering/AI/devops/security/system topics, otherwise use "share-news".',
      "- title, subtitle, cta, scene.title, scene.subtitle, stats.label, stats.value should be Vietnamese sentence structure, while preserving technical terms in English.",
      "- Keep title <= 70 chars.",
      "- Keep subtitle <= 140 chars.",
      "- accent must be a hex color like #7c3aed.",
      "- fps between 24 and 60.",
      "- width and height should be either 1080x1920 or 1920x1080.",
      "- You decide scene count based on prompt complexity, typically 3 to 12 scenes.",
      "- each scene must have: layout, title, subtitle, durationSec, accent(optional), media, voiceover(required).",
      "- durationSec for each scene is between 3 and 30.",
      "- CRITICAL: The voiceover across all scenes MUST flow like a single, cohesive story or presentation. Use transition words (liên từ) like 'Đầu tiên', 'Tuy nhiên', 'Hơn thế nữa', 'Thực tế là', 'Chính vì vậy', 'Để giải quyết vấn đề này' between scenes so they do not sound disconnected. Do not make it sound like isolated bullet points.",
      "- voiceover should be conversational, engaging, and sound natural when spoken.",
      "- layout must be one of: intro, standard, outro.",
      "- media.type must be one of: icon, image, chart, list.",
      "- media may include: src, isFloating, hasGlow, isZooming, data(number array), items(string array).",
      '- If media.type is "icon", media.src MUST be one of: sparkles, zap, rocket, check, chart, list, heart, brain, users, star, sun, coffee, book.',
      '- If media.type is "image", media.src MUST be a valid absolute URL starting with "https://" or "http://".',
      "- animationType must be one of: popIn, slideIn, fadeIn, bounceIn, rotateIn, zoomIn.",
      "- backgroundColor must be a hex color like #020617.",
      "- showGrid and showGradient are booleans.",
      "- icon (optional) has: url, position, size, opacity.",
      "- icon.position must be one of: top-left, top-right, bottom-left, bottom-right, center.",
      "- stats is an array of up to 4 items, each with: label, value, icon(optional).",
      "- No markdown, no explanations.",
      ...(forcedTemplateId
        ? [`- Force templateId to "${forcedTemplateId}" exactly.`]
        : []),
    ].join("\n");

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          controller.enqueue(sendEvent("progress", { stage: "queued", message: "Dang gui prompt toi Gemini..." }));

          const result = await ai.models.generateContent({
            model,
            contents: `${systemPrompt}\n\nUser prompt:\n${prompt}`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  templateId: {
                    type: "string",
                    enum: ["share-news", "technical"],
                  },
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  accent: { type: "string" },
                  cta: { type: "string" },
                  fps: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                  backgroundImage: { type: "string" },
                  icon: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      position: {
                        type: "string",
                        enum: ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
                      },
                      size: { type: "number" },
                      opacity: { type: "number" },
                    },
                    required: ["url", "position", "size"],
                    propertyOrdering: ["url", "position", "size", "opacity"],
                  },
                  animationType: {
                    type: "string",
                    enum: ["popIn", "slideIn", "fadeIn", "bounceIn", "rotateIn", "zoomIn"],
                  },
                  backgroundColor: { type: "string" },
                  showGrid: { type: "boolean" },
                  showGradient: { type: "boolean" },
                  stats: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" },
                        icon: { type: "string" },
                      },
                      required: ["label", "value"],
                      propertyOrdering: ["label", "value", "icon"],
                    },
                  },
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        layout: { type: "string", enum: ["intro", "standard", "outro"] },
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        durationSec: { type: "number" },
                        accent: { type: "string" },
                        voiceover: { type: "string" },
                        media: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["icon", "image", "chart", "list"] },
                            src: { type: "string" },
                            isFloating: { type: "boolean" },
                            hasGlow: { type: "boolean" },
                            isZooming: { type: "boolean" },
                            data: {
                              type: "array",
                              items: { type: "number" },
                            },
                            items: {
                              type: "array",
                              items: { type: "string" },
                            },
                          },
                          required: ["type"],
                          propertyOrdering: [
                            "type",
                            "src",
                            "isFloating",
                            "hasGlow",
                            "isZooming",
                            "data",
                            "items",
                          ],
                        },
                      },
                      required: ["layout", "title", "subtitle", "durationSec", "voiceover", "media"],
                      propertyOrdering: [
                        "layout",
                        "title",
                        "subtitle",
                        "durationSec",
                        "voiceover",
                        "accent",
                        "media",
                      ],
                    },
                  },
                },
                required: [
                  "title",
                  "templateId",
                  "subtitle",
                  "accent",
                  "cta",
                  "fps",
                  "width",
                  "height",
                  "scenes",
                  "animationType",
                  "backgroundColor",
                  "showGrid",
                  "showGradient",
                  "stats",
                ],
                propertyOrdering: [
                  "title",
                  "templateId",
                  "subtitle",
                  "accent",
                  "cta",
                  "fps",
                  "width",
                  "height",
                  "scenes",
                  "backgroundImage",
                  "icon",
                  "animationType",
                  "backgroundColor",
                  "showGrid",
                  "showGradient",
                  "stats",
                ],
              },
            },
          });

          controller.enqueue(sendEvent("progress", { stage: "parsing", message: "Dang xu ly ket qua..." }));

          const parsed = JSON.parse(result.text ?? "{}") as Partial<typeof defaultVideoSpec>;
          if (forcedTemplateId) {
            parsed.templateId = forcedTemplateId;
          }
          const spec = clampVideoSpec(parsed);
          const secondsFromPrompt = extractSecondsFromPrompt(prompt);
          if (secondsFromPrompt) {
            const safeSeconds = Math.max(3, Math.min(180, secondsFromPrompt));
            const sceneCount = Math.max(1, spec.scenes.length);
            const evenSceneDuration = Math.max(3, Math.round(safeSeconds / sceneCount));
            spec.scenes = spec.scenes.map((scene) => ({
              ...scene,
              durationSec: evenSceneDuration,
            }));
            spec.durationInFrames = Math.max(
              90,
              Math.min(5400, sceneCount * evenSceneDuration * spec.fps),
            );
          }

          controller.enqueue(sendEvent("done", { spec, model }));
          controller.close();
        } catch (streamError) {
          const detail =
            streamError instanceof Error ? streamError.message : "Unknown server error";
          controller.enqueue(
            sendEvent("error", {
              error: "Failed to generate video spec from Gemini.",
              detail,
            }),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: sseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return Response.json(
      {
        error: "Failed to generate video spec from Gemini.",
        detail: message,
      },
      { status: 500 },
    );
  }
}
