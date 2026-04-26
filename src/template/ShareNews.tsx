import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolateColors,
} from "remotion";
import { 
  Sparkles, Target, Zap, Rocket, CheckCircle, Quote, 
  BarChart3, ListChecks, Play, Heart, Share2, TrendingUp,
  BrainCircuit, Users, Sun, Coffee, BookOpen, Star
} from "lucide-react";

// --- TYPES ---
export type MediaType = "icon" | "image" | "chart" | "list";

export type MediaConfig = {
  type: MediaType;
  src?: string;          // Tên icon hoặc URL ảnh
  isFloating?: boolean;  // Hiệu ứng bay bồng bềnh
  hasGlow?: boolean;     // Hiệu ứng hào quang
  isZooming?: boolean;   // Hiệu ứng Ken Burns (zoom ảnh)
  data?: number[];       // Dữ liệu cho biểu đồ
  items?: string[];      // Dữ liệu cho danh sách
};

export type VideoScene = {
  layout: "intro" | "standard" | "outro"; 
  textPosition?: "top" | "middle" | "bottom";
  textAlign?: "left" | "center" | "right";
  title: string;
  subtitle?: string;
  durationSec: number;
  accent: string;
  media?: MediaConfig;
};

type PromptVideoProps = {
  cta?: string;
  scenes?: VideoScene[];
};

type SceneInfo = {
  index: number;
  localFrame: number;
  total: number;
};

// --- UTILS ---
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const FALLBACK_ACCENT = "#22d3ee";

// --- DATA CẤU HÌNH (THAY ĐỔI Ở ĐÂY ĐỂ TÙY BIẾN VIDEO) ---
const DEFAULT_SCENES: VideoScene[] = [
  {
    layout: "intro",
    textPosition: "middle",
    textAlign: "center",
    title: "5 Thói Quen Nhỏ\nThay Đổi Vận Mệnh",
    subtitle: "Người thành công không làm điều khác biệt, họ làm những việc nhỏ một cách khác biệt.",
    durationSec: 4,
    accent: "#facc15", 
    media: {
      type: "icon",
      src: "star",
      isFloating: true,
      hasGlow: true,
    }
  },
  {
    layout: "standard",
    textPosition: "top",
    textAlign: "left",
    title: "Sức Mạnh Của Sự Kiên Trì",
    subtitle: "Chỉ cần cải thiện 1% mỗi ngày, sau 1 năm bạn sẽ giỏi hơn gấp 37 lần.",
    durationSec: 5.5,
    accent: "#38bdf8", 
    media: {
      type: "chart",
      data: [1, 5, 25, 100], 
    }
  },
  {
    layout: "standard",
    textPosition: "bottom",
    textAlign: "center",
    title: "Lộ Trình Buổi Sáng",
    subtitle: "Bắt đầu ngày mới như một nhà vô địch với 3 bước:",
    durationSec: 6,
    accent: "#4ade80", 
    media: {
      type: "list",
      items: [
        "Thức dậy lúc 5:00 AM",
        "15 phút thiền định tĩnh tâm",
        "Đọc 10 trang sách phát triển"
      ]
    }
  },
  {
    layout: "outro",
    textPosition: "middle",
    textAlign: "center",
    title: "Bắt Đầu Ngay Hôm Nay!",
    subtitle: "Đừng chờ đợi cơ hội, hãy tự tạo ra nó. Nhấn Follow để cùng nhau tiến bộ mỗi ngày.",
    durationSec: 4,
    accent: "#f472b6", 
    media: {
      type: "icon",
      src: "rocket",
      hasGlow: true,
      isFloating: true,
    }
  },
];

const getShortVideoLayout = (width: number, height: number) => {
  const scale = clamp((width / height) > (9/16) ? height / 1920 : width / 1080, 0.5, 1.5);
  return {
    stagePaddingX: Math.round(70 * scale),
    stagePaddingTop: Math.round(200 * scale),
    stagePaddingBottom: Math.round(200 * scale),
    titleSize: Math.round(86 * scale),
    subtitleSize: Math.round(40 * scale),
    chipSize: Math.round(28 * scale),
    iconSize: Math.round(130 * scale),
  };
};

const getSceneInfo = (frame: number, scenes: VideoScene[], fps: number): SceneInfo => {
  let cursor = 0;
  for (let index = 0; index < scenes.length; index++) {
    const sceneFrames = Math.max(1, Math.round(scenes[index].durationSec * fps));
    const end = cursor + sceneFrames;
    if (frame < end) return { index, localFrame: frame - cursor, total: sceneFrames };
    cursor = end;
  }
  const last = scenes[scenes.length - 1];
  const lastFrames = Math.max(1, Math.round(last.durationSec * fps));
  return { index: scenes.length - 1, localFrame: lastFrames - 1, total: lastFrames };
};

const PARTICLES = new Array(30).fill(0).map((_, i) => ({
  id: i, x: (i * 137.5) % 100, y: (i * 93.1) % 100,
  size: ((i * 47) % 5) + 2, speed: ((i * 11) % 4) * 0.4 + 0.3, delay: (i * 19) % 100,
}));

const IconRender = ({ name, size, color }: { name?: string; size: number; color: string }) => {
  const props = { size, color, strokeWidth: 1.5 };
  switch (name) {
    case "sparkles": return <Sparkles {...props} />;
    case "zap": return <Zap {...props} />;
    case "rocket": return <Rocket {...props} />;
    case "check": return <CheckCircle {...props} />;
    case "chart": return <BarChart3 {...props} />;
    case "list": return <ListChecks {...props} />;
    case "heart": return <Heart {...props} />;
    case "brain": return <BrainCircuit {...props} />;
    case "users": return <Users {...props} />;
    case "star": return <Star {...props} />;
    case "sun": return <Sun {...props} />;
    case "coffee": return <Coffee {...props} />;
    case "book": return <BookOpen {...props} />;
    default: return <Sparkles {...props} />;
  }
};

export const ShortVideoTemplate: React.FC<PromptVideoProps> = ({
  cta = "Bắt đầu hành trình",
  scenes = DEFAULT_SCENES,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  const scene = getSceneInfo(frame, scenes, fps);
  const activeScene = scenes[scene.index];
  const textPosition = activeScene.textPosition ?? "middle";
  const textAlign = activeScene.textAlign ?? "center";
  const getSceneAccent = (index: number) =>
    scenes[index]?.accent ?? FALLBACK_ACCENT;
  const activeAccent = getSceneAccent(scene.index);
  const layout = getShortVideoLayout(width, height);

  const bgAccentColor = useMemo(() => {
    if (scene.index === 0) return activeAccent;
    const prevAccent = getSceneAccent(scene.index - 1);
    return interpolateColors(scene.localFrame, [0, 25], [prevAccent, activeAccent]);
  }, [scene.index, scene.localFrame, activeAccent, scenes]);

  const slideIn = spring({ frame: scene.localFrame, fps, config: { damping: 18, stiffness: 120, mass: 0.5 } });
  const textReveal = spring({ frame: scene.localFrame - 10, fps, config: { damping: 15, stiffness: 90 } });
  
  const framesLeft = scene.total - scene.localFrame;
  const fadeOut = interpolate(framesLeft, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideOutY = interpolate(framesLeft, [0, 15], [-50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bgX = 50 + Math.sin(frame / 60) * 20;
  const bgY = 50 + Math.cos(frame / 50) * 20;
  
  const floatingY = Math.sin(frame / 15) * 20;
  const auraScale = 1 + Math.sin(frame / 25) * 0.2;
  const continuousZoom = 1 + (scene.localFrame / scene.total) * 0.12;
  const outroFade = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0]);

  const renderVisualContent = () => {
    if (!activeScene.media) return null;
    const { type, src, isFloating, hasGlow, isZooming, data, items } = activeScene.media;
    
    if (type === "image" && src) {
      return (
        <div style={{ width: "100%", height: 420, borderRadius: 40, overflow: "hidden", boxShadow: `0 30px 60px rgba(0,0,0,0.5)`, position: "relative", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ width: "100%", height: "100%", transform: `scale(${isZooming ? continuousZoom : 1})`, transformOrigin: "center center" }}>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4))" }}/>
        </div>
      );
    }

    if (type === "chart" && data) {
      return (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 30, height: 300, width: "100%", padding: "0 10px" }}>
          {data.map((val, idx) => {
            const barSpring = spring({ frame: scene.localFrame - 20 - idx * 10, fps, config: { damping: 14 } });
            const currentHeight = barSpring * val;
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, flex: 1 }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: activeAccent, opacity: barSpring, transform: `translateY(${(1-barSpring)*15}px)`, textShadow: `0 0 20px ${activeAccent}66` }}>
                  {Math.round(currentHeight)}%
                </div>
                <div style={{ width: "100%", maxWidth: 90, height: 220, background: "rgba(255,255,255,0.08)", borderRadius: 24, position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${currentHeight}%`, background: `linear-gradient(180deg, ${activeAccent}, ${activeAccent}66)`, borderRadius: 24, boxShadow: `0 0 30px ${activeAccent}88` }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === "list" && items) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", marginTop: 20 }}>
          {items.map((item, idx) => {
            const itemSpring = spring({ frame: scene.localFrame - 25 - idx * 15, fps, config: { damping: 16 } });
            return (
              <div key={idx} style={{ 
                display: "flex", alignItems: "center", gap: 24, 
                background: "rgba(255,255,255,0.05)", padding: "28px 32px", borderRadius: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                transform: `translateX(${(1 - itemSpring) * -50}px)`, opacity: itemSpring,
                boxShadow: `0 15px 40px rgba(0,0,0,0.3)`
              }}>
                <div style={{ background: activeAccent, padding: 12, borderRadius: "50%", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${activeAccent}` }}>
                  <CheckCircle size={32} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{item}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ position: "relative", padding: 30 }}>
        {hasGlow && (
          <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: `radial-gradient(circle, ${activeAccent}44, transparent 75%)`, transform: `scale(${auraScale * 1.6})`, filter: "blur(30px)", opacity: 0.7 }}/>
        )}
        <div style={{
          transform: `translateY(${isFloating ? floatingY : 0}px)`,
          background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
          padding: 50, borderRadius: 999,
          boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 50px ${activeAccent}33`,
          border: `1px solid rgba(255,255,255,0.2)`, position: "relative", zIndex: 2, backdropFilter: "blur(10px)",
        }}>
          <IconRender name={src || "sparkles"} size={layout.iconSize} color={activeAccent} />
        </div>
      </div>
    );
  };

  const renderTextContent = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems:
          textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
        textAlign,
        width: "100%",
      }}
    >
      <div style={{
        fontSize: activeScene.layout === "intro" ? layout.titleSize + 20 : layout.titleSize,
        lineHeight: 1.1, fontWeight: 900, letterSpacing: -2,
        transform: `scale(${0.9 + textReveal * 0.1}) translateY(${(1 - textReveal) * 30}px)`, opacity: textReveal,
        background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        textWrap: "balance", textShadow: `0 15px 45px rgba(0,0,0,0.4)`, whiteSpace: "pre-line",
      }}>
        {activeScene.title}
      </div>
      
      {activeScene.subtitle && (
        <div style={{
          marginTop: 32,
          fontSize: layout.subtitleSize, lineHeight: 1.4, fontWeight: 500,
          color: activeScene.layout === "intro" ? activeAccent : "rgba(255, 255, 255, 0.8)",
          opacity: textReveal, textWrap: "balance", transform: `translateY(${(1 - textReveal) * 20}px)`, maxWidth: "100%",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          borderLeft: textAlign === "left" ? `3px solid ${activeAccent}` : "none",
          borderRight: textAlign === "right" ? `3px solid ${activeAccent}` : "none",
          paddingLeft: textAlign === "left" ? 16 : 0,
          paddingRight: textAlign === "right" ? 16 : 0,
        }}>
          {activeScene.subtitle}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: "#020617", color: "#f8fafc", fontFamily: "var(--font-geist-sans), system-ui, sans-serif", opacity: outroFade }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle 1000px at ${bgX}% ${bgY}%, ${bgAccentColor}22, transparent 85%)`, transition: "background 0.8s ease" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(15, 23, 42, 0.95), transparent 100%)" }} />
      
      <AbsoluteFill>
        {PARTICLES.map((p) => {
          const currentY = (p.y - (frame * p.speed * 0.25) + 200) % 120;
          return <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${currentY}%`, width: p.size, height: p.size, borderRadius: "50%", background: bgAccentColor, opacity: 0.2 + Math.sin((frame + p.delay) / 20) * 0.2, filter: "blur(1px)" }} />;
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          width: width, height: height,
          padding: `${layout.stagePaddingTop}px ${layout.stagePaddingX}px ${layout.stagePaddingBottom}px`,
          display: "flex", flexDirection: "column", justifyContent: "center", position: "relative",
          zIndex: 10,
        }}>
          
          <div style={{ 
            display: "flex", 
            flexDirection: textPosition === "bottom" ? "column-reverse" : "column",
            alignItems:
              textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
            justifyContent: textPosition === "middle" ? "center" : "space-between",
            gap: textPosition === "middle" ? 72 : 40,
            transform: `translateY(${(1 - slideIn) * 80 + slideOutY}px)`, opacity: slideIn * fadeOut,
            width: "100%",
          }}>
            
            {activeScene.media?.type !== "list" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    textAlign === "left"
                      ? "flex-start"
                      : textAlign === "right"
                        ? "flex-end"
                        : "center",
                  width: "100%",
                }}
              >
                {renderVisualContent()}
              </div>
            )}

            {renderTextContent()}

            {activeScene.media?.type === "list" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    textAlign === "left"
                      ? "flex-start"
                      : textAlign === "right"
                        ? "flex-end"
                        : "center",
                  width: "100%",
                }}
              >
                {renderVisualContent()}
              </div>
            )}

          </div>

          {activeScene.layout === "outro" && (
            <div style={{ position: "absolute", bottom: layout.stagePaddingBottom / 1.2, left: layout.stagePaddingX, right: layout.stagePaddingX, display: "flex", justifyContent: "center" }}>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 20, borderRadius: 999, 
                background: "#fff", padding: "28px 64px", 
                boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${activeAccent}66`, 
                transform: `translateY(${(1 - spring({ frame: scene.localFrame, fps, config: { damping: 20 } })) * 30}px) scale(${1 + Math.sin(frame/12)*0.04})`,
              }}>
                <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: activeAccent, boxShadow: `0 0 15px ${activeAccent}` }} />
                <span style={{ color: "#000", letterSpacing: 1, textTransform: "uppercase", fontSize: layout.chipSize, fontWeight: 900 }}>
                  {cta}
                </span>
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};