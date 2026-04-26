import type { VideoSpec } from "@/lib/video-spec";

type MockPreset = {
  id: string;
  name: string;
  spec: VideoSpec;
};

const withComputedDuration = (
  spec: Omit<
    VideoSpec,
    | "templateId"
    | "durationInFrames"
    | "backgroundImage"
    | "icon"
    | "animationType"
    | "backgroundColor"
    | "showGrid"
    | "showGradient"
    | "stats"
  >,
): VideoSpec => {
  const durationInFrames = spec.scenes.reduce(
    (sum, scene) => sum + scene.durationSec * spec.fps,
    0,
  );

  return {
    templateId: "share-news",
    ...spec,
    durationInFrames,
    backgroundImage: "/next.svg",
    icon: {
      url: "/vercel.svg",
      position: "bottom-right",
      size: 68,
      opacity: 0.22,
    },
    animationType: "popIn",
    backgroundColor: "#020617",
    showGrid: true,
    showGradient: true,
    stats: [
      { label: "Scenes", value: String(spec.scenes.length) },
      { label: "FPS", value: String(spec.fps) },
      { label: "Length", value: `${Math.round(durationInFrames / spec.fps)}s` },
    ],
  };
};

export const shortVideoMockPresets: MockPreset[] = [
  {
    id: "english-app",
    name: "English App Intro",
    spec: withComputedDuration({
      title: "Master English Daily",
      subtitle: "Learn smarter with 10-minute lessons.",
      accent: "#22c55e",
      cta: "Start Free Today",
      fps: 30,
      width: 1080,
      height: 1920,
      scenes: [
        {
          layout: "intro",
          title: "Your English Journey Starts Here",
          subtitle: "Daily bite-size lessons for busy learners.",
          durationSec: 6,
          accent: "#22c55e",
        },
        {
          layout: "standard",
          title: "Speak with Confidence",
          subtitle: "Practice real conversations with AI feedback.",
          durationSec: 7,
          accent: "#16a34a",
        },
        {
          layout: "outro",
          title: "Track Your Progress",
          subtitle: "Build streaks and unlock milestones every week.",
          durationSec: 7,
          accent: "#15803d",
        },
      ],
    }),
  },
  {
    id: "fitness-coach",
    name: "Fitness Coach Promo",
    spec: withComputedDuration({
      title: "Train Better, Every Day",
      subtitle: "Your pocket coach for home workouts.",
      accent: "#06b6d4",
      cta: "Try 7-Day Plan",
      fps: 30,
      width: 1080,
      height: 1920,
      scenes: [
        {
          layout: "intro",
          title: "Short Workouts, Big Results",
          subtitle: "Get fit in just 15 minutes a day.",
          durationSec: 6,
          accent: "#06b6d4",
        },
        {
          layout: "standard",
          title: "Plans for Every Level",
          subtitle: "Beginner to advanced with guided intensity.",
          durationSec: 7,
          accent: "#0891b2",
        },
        {
          layout: "outro",
          title: "Keep Momentum",
          subtitle: "Smart reminders and streaks keep you on track.",
          durationSec: 7,
          accent: "#0e7490",
        },
      ],
    }),
  },
  {
    id: "edtech-story",
    name: "7-Scene TikTok Style",
    spec: withComputedDuration({
      title: "Learn English Fast",
      subtitle: "Scene-driven short video template demo.",
      accent: "#3b82f6",
      cta: "Download App",
      fps: 30,
      width: 1080,
      height: 1920,
      scenes: [
        { layout: "intro", title: "Stop Translating", subtitle: "Start thinking in English from day one.", durationSec: 5, accent: "#60a5fa" },
        { layout: "standard", title: "Daily Micro Lessons", subtitle: "Short sessions designed for consistency.", durationSec: 5, accent: "#3b82f6" },
        { layout: "standard", title: "Real Voice Practice", subtitle: "Instant pronunciation feedback with AI.", durationSec: 5, accent: "#2563eb" },
        { layout: "standard", title: "Vocabulary in Context", subtitle: "Learn words in stories, not in isolation.", durationSec: 5, accent: "#1d4ed8" },
        { layout: "standard", title: "Grammar That Sticks", subtitle: "Visual patterns make structures memorable.", durationSec: 5, accent: "#1e40af" },
        { layout: "standard", title: "Track Your Progress", subtitle: "See weekly growth and celebrate streaks.", durationSec: 5, accent: "#1e3a8a" },
        { layout: "outro", title: "Speak Confidently", subtitle: "Build confidence with guided speaking drills.", durationSec: 5, accent: "#3b82f6" },
      ],
    }),
  },
];
