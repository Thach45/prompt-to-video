export type VideoScene = {
  layout: "intro" | "standard" | "outro";
  title: string;
  subtitle?: string;
  durationSec: number;
  accent?: string;
  media?: {
    type: "icon" | "image" | "chart" | "list";
    src?: string;
    isFloating?: boolean;
    hasGlow?: boolean;
    isZooming?: boolean;
    data?: number[];
    items?: string[];
  };
};

const INTERNAL_ICON_NAMES = [
  "sparkles",
  "zap",
  "rocket",
  "check",
  "chart",
  "list",
  "heart",
  "brain",
  "users",
  "star",
  "sun",
  "coffee",
  "book",
] as const;

const INTERNAL_ICON_SET = new Set<string>(INTERNAL_ICON_NAMES);

const isValidImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export type AnimationType =
  | "popIn"
  | "slideIn"
  | "fadeIn"
  | "bounceIn"
  | "rotateIn"
  | "zoomIn";

export type IconPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type TemplateIcon = {
  url: string;
  position: IconPosition;
  size: number;
  opacity?: number;
};

export type TemplateStat = {
  label: string;
  value: string;
  icon?: string;
};

export type VideoSpec = {
  templateId: "share-news" | "technical";
  title: string;
  subtitle: string;
  accent: string;
  cta: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  scenes: VideoScene[];
  backgroundImage?: string;
  icon?: TemplateIcon;
  animationType: AnimationType;
  backgroundColor: string;
  showGrid: boolean;
  showGradient: boolean;
  stats: TemplateStat[];
};

export const defaultVideoSpec: VideoSpec = {
  templateId: "share-news",
  title: "Build your video from a prompt",
  subtitle: "Turn one idea into scenes, transitions, and captions in minutes.",
  accent: "#7c3aed",
  cta: "Try it now",
  durationInFrames: 300,
  fps: 30,
  width: 1080,
  height: 1920,
  backgroundImage: undefined,
  icon: undefined,
  animationType: "popIn",
  backgroundColor: "#020617",
  showGrid: true,
  showGradient: true,
  stats: [
    { label: "Scenes", value: "3" },
    { label: "FPS", value: "30" },
    { label: "Length", value: "24s" },
  ],
  scenes: [
    {
      layout: "intro",
      title: "Start with one prompt",
      subtitle: "Describe your topic, tone, and target audience.",
      durationSec: 8,
      accent: "#7c3aed",
      media: { type: "icon", src: "sparkles", hasGlow: true, isFloating: true },
    },
    {
      layout: "standard",
      title: "Gemini drafts scenes",
      subtitle: "The script is broken into clear visual segments.",
      durationSec: 8,
      accent: "#2563eb",
      media: { type: "chart", data: [12, 28, 46, 78] },
    },
    {
      layout: "outro",
      title: "Preview and iterate",
      subtitle: "Adjust text, pacing, and color before export.",
      durationSec: 8,
      accent: "#0ea5e9",
      media: { type: "icon", src: "rocket", hasGlow: true },
    },
  ],
};

export const clampVideoSpec = (input: Partial<VideoSpec>): VideoSpec => {
  const safeTemplateId =
    input.templateId === "technical" || input.templateId === "share-news"
      ? input.templateId
      : defaultVideoSpec.templateId;
  const safeFps = Number.isFinite(input.fps)
    ? Math.min(60, Math.max(24, Math.floor(input.fps as number)))
    : defaultVideoSpec.fps;

  // This template is dedicated for short-form vertical video (TikTok/Reels/Shorts).
  // Keep composition fixed to 9:16 to avoid broken layout from arbitrary model outputs.
  const safeWidth = 1080;
  const safeHeight = 1920;

  const rawScenes = Array.isArray(input.scenes) ? input.scenes : [];
  const safeScenes: VideoScene[] = [];
  for (const scene of rawScenes) {
    if (!scene || safeScenes.length >= 12) {
      continue;
    }
    const safeAccent =
      typeof scene.accent === "string" && /^#([0-9a-fA-F]{6})$/.test(scene.accent)
        ? scene.accent
        : /^#([0-9a-fA-F]{6})$/.test(input.accent ?? "")
          ? (input.accent as string)
          : defaultVideoSpec.accent;
    const safeDurationSec = Number.isFinite(scene.durationSec)
      ? Math.min(30, Math.max(3, Math.round(scene.durationSec)))
      : 6;
    const safeLayout =
      scene.layout === "intro" || scene.layout === "outro" || scene.layout === "standard"
        ? scene.layout
        : "standard";

    const mediaType =
      scene.media?.type === "icon" ||
      scene.media?.type === "image" ||
      scene.media?.type === "chart" ||
      scene.media?.type === "list"
        ? scene.media.type
        : undefined;

    const rawSrc =
      typeof scene.media?.src === "string" && scene.media.src.trim().length > 0
        ? scene.media.src.trim()
        : undefined;
    const safeIconSrc =
      rawSrc && INTERNAL_ICON_SET.has(rawSrc) ? rawSrc : "sparkles";
    const safeImageSrc = rawSrc && isValidImageUrl(rawSrc) ? rawSrc : undefined;

    const safeMedia =
      mediaType === undefined
        ? undefined
        : mediaType === "image" && !safeImageSrc
          ? {
              type: "icon" as const,
              src: "sparkles",
              isFloating: true,
              hasGlow: true,
              isZooming: false,
              data: undefined,
              items: undefined,
            }
          : {
              type: mediaType,
              src:
                mediaType === "image"
                  ? safeImageSrc
                  : mediaType === "icon"
                    ? safeIconSrc
                    : rawSrc,
              isFloating: Boolean(scene.media?.isFloating),
              hasGlow: Boolean(scene.media?.hasGlow),
              isZooming: Boolean(scene.media?.isZooming),
              data:
                mediaType === "chart" && Array.isArray(scene.media?.data)
                  ? scene.media.data
                      .map((value) => (Number.isFinite(value) ? Number(value) : NaN))
                      .filter((value) => Number.isFinite(value))
                      .slice(0, 8)
                  : undefined,
              items:
                mediaType === "list" && Array.isArray(scene.media?.items)
                  ? scene.media.items
                      .map((value) => (typeof value === "string" ? value.trim() : ""))
                      .filter((value) => value.length > 0)
                      .slice(0, 8)
                  : undefined,
            };

    safeScenes.push({
      title: scene.title?.trim() || "Untitled scene",
      subtitle: scene.subtitle?.trim() || undefined,
      durationSec: safeDurationSec,
      accent: safeAccent,
      layout: safeLayout,
      media: safeMedia,
    });
  }

  const scenes = safeScenes.length > 0 ? safeScenes : defaultVideoSpec.scenes;
  const totalDurationInFrames = scenes.reduce((sum, scene) => sum + scene.durationSec * safeFps, 0);
  const safeFrames = Math.min(5400, Math.max(90, totalDurationInFrames));

  const safeAnimationType =
    input.animationType === "popIn" ||
    input.animationType === "slideIn" ||
    input.animationType === "fadeIn" ||
    input.animationType === "bounceIn" ||
    input.animationType === "rotateIn" ||
    input.animationType === "zoomIn"
      ? input.animationType
      : defaultVideoSpec.animationType;

  const safeBackgroundColor =
    typeof input.backgroundColor === "string" &&
    /^#([0-9a-fA-F]{6})$/.test(input.backgroundColor)
      ? input.backgroundColor
      : defaultVideoSpec.backgroundColor;

  const safeBackgroundImage =
    typeof input.backgroundImage === "string" && input.backgroundImage.trim().length > 0
      ? input.backgroundImage.trim()
      : undefined;

  const safeIconPosition =
    input.icon?.position === "top-left" ||
    input.icon?.position === "top-right" ||
    input.icon?.position === "bottom-left" ||
    input.icon?.position === "bottom-right" ||
    input.icon?.position === "center"
      ? input.icon.position
      : "top-right";

  const safeIcon =
    input.icon && typeof input.icon.url === "string" && input.icon.url.trim().length > 0
      ? {
          url: input.icon.url.trim(),
          position: safeIconPosition,
          size: Number.isFinite(input.icon.size)
            ? Math.min(160, Math.max(24, Math.floor(input.icon.size)))
            : 64,
          opacity: Number.isFinite(input.icon.opacity)
            ? Math.min(1, Math.max(0.05, Number(input.icon.opacity)))
            : 0.2,
        }
      : undefined;

  const rawStats = Array.isArray(input.stats) ? input.stats : [];
  const safeStats: TemplateStat[] = rawStats
    .map((stat) => ({
      label: stat?.label?.trim() || "",
      value: stat?.value?.trim() || "",
      icon: stat?.icon?.trim() || undefined,
    }))
    .filter((stat) => stat.label.length > 0 && stat.value.length > 0)
    .slice(0, 4);

  return {
    templateId: safeTemplateId,
    title: input.title?.trim() || defaultVideoSpec.title,
    subtitle: input.subtitle?.trim() || defaultVideoSpec.subtitle,
    accent: /^#([0-9a-fA-F]{6})$/.test(input.accent ?? "")
      ? (input.accent as string)
      : defaultVideoSpec.accent,
    cta: input.cta?.trim() || defaultVideoSpec.cta,
    durationInFrames: safeFrames,
    fps: safeFps,
    width: safeWidth,
    height: safeHeight,
    scenes,
    backgroundImage: safeBackgroundImage,
    icon: safeIcon,
    animationType: safeAnimationType,
    backgroundColor: safeBackgroundColor,
    showGrid: input.showGrid ?? defaultVideoSpec.showGrid,
    showGradient: input.showGradient ?? defaultVideoSpec.showGradient,
    stats: safeStats.length > 0 ? safeStats : defaultVideoSpec.stats,
  };
};
