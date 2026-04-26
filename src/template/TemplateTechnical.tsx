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
  BrainCircuit, Users, Sun, Coffee, BookOpen, Star,
  Bot, Cpu, Terminal, Code, Network, Database, ChevronRight, Lock, Fingerprint
} from "lucide-react";

// --- TYPES ---
export type MediaType = "icon" | "image" | "chart" | "list";

export type MediaConfig = {
  type: MediaType;
  src?: string;          
  isFloating?: boolean;  
  hasGlow?: boolean;     
  isZooming?: boolean;   
  data?: number[];       
  items?: string[];      
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

type TemplateTechnicalProps = {
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

const getContrastTextColor = (hexColor: string) => {
  const clean = hexColor.replace("#", "");
  if (clean.length !== 6) return "#000000";
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
};

const withAlpha = (hexColor: string, alphaHex: string) => `${hexColor}${alphaHex}`;
const buildBinaryColumn = (length: number, seed: number) =>
  Array.from({ length }, (_, idx) => (((idx + seed) * 7) % 2 === 0 ? "1" : "0")).join("\n");
const COLORS = {
  bg: "#f8fafc",
  dim: "#6b7280",
};
// --- DATA CẤU HÌNH ---
const DEFAULT_SCENES: VideoScene[] = [
  {
    layout: "intro",
    textPosition: "middle", 
    textAlign: "center",    
    title: "KỶ NGUYÊN AI AGENT\nĐÃ BẮT ĐẦU",
    subtitle: "SYSTEM INIT // Trí tuệ nhân tạo giờ đây có thể tự động thực thi chuỗi nhiệm vụ phức tạp thay con người.",
    durationSec: 4.5,
    accent: "#0ea5e9", 
    media: { type: "icon", src: "cpu", isFloating: true, hasGlow: true }
  },
  {
    layout: "standard",
    textPosition: "top",    
    textAlign: "left",      
    title: "TỐC ĐỘ ÁP DỤNG",
    subtitle: "Tỉ lệ % doanh nghiệp tích hợp Autonomous AI vào hệ thống lõi trong vòng 3 năm tới (2024 - 2026).",
    durationSec: 5.5,
    accent: "#8b5cf6", 
    media: { type: "chart", data: [12, 45, 88] }
  },
  {
    layout: "standard",
    textPosition: "bottom", 
    textAlign: "center",    
    title: "TƯ DUY HỆ THỐNG",
    subtitle: "Kiến trúc Multi-Agent cho phép các AI tự giao tiếp và sửa lỗi cho nhau mà không cần con người can thiệp.",
    durationSec: 5,
    accent: "#f59e0b", 
    media: { type: "image", src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop", isZooming: true }
  },
  {
    layout: "standard",
    textPosition: "top",    
    textAlign: "right",     
    title: "AI TỰ ĐỘNG HÓA",
    subtitle: "Trong Software Development, Agent hiện đang thực thi các tác vụ:",
    durationSec: 6.5,
    accent: "#10b981", 
    media: {
      type: "list",
      items: ["Phân tích & Tự Debug Code", "Giám sát Database 24/7", "Deploy lên Cloud Server"]
    }
  },
  {
    layout: "outro",
    textPosition: "middle", 
    textAlign: "center",
    title: "UPGRADE KỸ NĂNG?",
    subtitle: "Cảnh báo: Công nghệ thay đổi từng ngày. Đừng để bị bỏ lại phía sau.",
    durationSec: 4.5,
    accent: "#f43f5e", 
    media: { type: "icon", src: "terminal", hasGlow: true, isFloating: true }
  },
];

const getShortVideoLayout = (width: number, height: number) => {
  const scale = clamp((width / height) > (9/16) ? height / 1920 : width / 1080, 0.5, 1.5);
  return {
    stagePaddingX: Math.round(60 * scale),
    stagePaddingTop: Math.round(150 * scale),
    stagePaddingBottom: Math.round(150 * scale),
    titleSize: Math.round(80 * scale),
    subtitleSize: Math.round(36 * scale),
    chipSize: Math.round(26 * scale),
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

// --- DATA STREAMS GENERATOR ---
const DATA_STREAMS = new Array(8).fill(0).map((_, i) => ({
  id: i,
  x: [5, 15, 25, 75, 85, 95][i % 6] + (Math.random() * 2 - 1),
  speed: 2 + Math.random() * 3,
  length: 10 + Math.floor(Math.random() * 20),
  delay: Math.random() * 100
}));

// Icon rendering
const IconRender = ({ name, size, color }: { name?: string; size: number; color: string }) => {
  const props = { size, color, strokeWidth: 1.5 };
  switch (name) {
    case "bot": return <Bot {...props} />;
    case "cpu": return <Cpu {...props} />;
    case "terminal": return <Terminal {...props} />;
    case "code": return <Code {...props} />;
    case "network": return <Network {...props} />;
    case "database": return <Database {...props} />;
    case "chart": return <BarChart3 {...props} />;
    default: return <Cpu {...props} />;
  }
};

export const TemplateTechnical: React.FC<TemplateTechnicalProps> = ({
  cta = "INITIALIZE CONNECTION",
  scenes = DEFAULT_SCENES,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  const scene = getSceneInfo(frame, scenes, fps);
  const activeScene = scenes[scene.index];
  const activeAccent = activeScene.accent;
  const accentTextColor = getContrastTextColor(activeAccent);
  
  const textPosition = activeScene.textPosition || "top";
  const textAlign = activeScene.textAlign || "left";
  
  const layout = getShortVideoLayout(width, height);

  const slideIn = spring({ frame: scene.localFrame, fps, config: { damping: 14, stiffness: 150, mass: 0.4 } });
  const textReveal = spring({ frame: scene.localFrame - 5, fps, config: { damping: 12, stiffness: 140 } });
  
  const framesLeft = scene.total - scene.localFrame;
  const fadeOut = interpolate(framesLeft, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const bgY = (frame * 1.5) % 80;
  const floatAnim = Math.sin(frame / 10) * 12;
  const outroFade = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0]);

  // --- RENDER VISUAL ---
  const renderVisualContent = () => {
    if (!activeScene.media) return null;
    const { type, src, isFloating, data, items } = activeScene.media;
    
    // 1. IMAGE TIER
    if (type === "image" && src) {
      const scanLineY = (frame * 4) % 380; // Laser scanner
      return (
        <div style={{ 
          width: "100%", height: 380, position: "relative", 
          border: `1px solid ${activeAccent}66`, background: "rgba(0,0,0,0.8)",
          boxShadow: `0 0 40px ${activeAccent}33`, padding: 8
        }}>
          {/* Tech Corners */}
          <div style={{ position: "absolute", top: -2, left: -2, width: 30, height: 30, borderTop: `4px solid ${activeAccent}`, borderLeft: `4px solid ${activeAccent}`, zIndex: 5 }} />
          <div style={{ position: "absolute", top: -2, right: -2, width: 30, height: 30, borderTop: `4px solid ${activeAccent}`, borderRight: `4px solid ${activeAccent}`, zIndex: 5 }} />
          <div style={{ position: "absolute", bottom: -2, left: -2, width: 30, height: 30, borderBottom: `4px solid ${activeAccent}`, borderLeft: `4px solid ${activeAccent}`, zIndex: 5 }} />
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 30, height: 30, borderBottom: `4px solid ${activeAccent}`, borderRight: `4px solid ${activeAccent}`, zIndex: 5 }} />
          
          <div style={{ width: "100%", height: "100%", overflow: "hidden", filter: "contrast(1.2) sepia(0.2) hue-rotate(180deg)", position: "relative" }}>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, transform: `scale(${activeScene.media.isZooming ? 1 + (scene.localFrame / scene.total) * 0.15 : 1})` }} />
            {/* Laser Scanner */}
            <div style={{ position: "absolute", top: scanLineY, left: 0, right: 0, height: 2, background: activeAccent, boxShadow: `0 0 20px 4px ${activeAccent}` }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)", pointerEvents: "none" }}/>
        </div>
      );
    }

    // 2. CHART TIER
    if (type === "chart" && data) {
      return (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 30, height: 300, width: "100%", position: "relative" }}>
          {/* Background Grid for Chart */}
          <div style={{ position: "absolute", inset: "40px 0 0 0", borderBottom: `2px solid ${activeAccent}44`, display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 0 }}>
             {[1,2,3,4].map(i => <div key={i} style={{ borderBottom: `1px dashed ${activeAccent}22`, width: "100%", height: "25%" }} />)}
          </div>

          {data.map((val, idx) => {
            const barSpring = spring({ frame: scene.localFrame - 10 - idx * 8, fps, config: { damping: 14, stiffness: 100 } });
            const currentHeight = barSpring * val;
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, zIndex: 1 }}>
                <div style={{ 
                  fontSize: 32, fontFamily: "'Space Mono', 'Courier New', monospace", fontWeight: 700, 
                  color: "#fff", transform: `translateY(${(1-barSpring)*20}px)`, textShadow: `0 0 20px ${activeAccent}`
                }}>
                  {Math.round(currentHeight)}<span style={{ color: activeAccent, fontSize: 20 }}>%</span>
                </div>
                <div style={{ 
                  width: "100%", maxWidth: 80, height: 220, 
                  background: "rgba(0,0,0,0.6)", border: `1px solid ${activeAccent}44`,
                  position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end"
                }}>
                  <div style={{ 
                    width: "100%", height: `${currentHeight}%`, 
                    background: `repeating-linear-gradient(0deg, ${activeAccent}, ${activeAccent} 10px, transparent 10px, transparent 14px)`,
                    boxShadow: `0 0 30px ${activeAccent}66`, transition: "height 0.1s linear"
                  }} />
                </div>
                <div style={{ fontSize: 14, fontFamily: "monospace", color: activeAccent, background: `${activeAccent}22`, padding: "4px 12px", borderRadius: 4 }}>
                  NODE_0{idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // 3. LIST TIER
    if (type === "list" && items) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
          {items.map((item, idx) => {
            const itemSpring = spring({ frame: scene.localFrame - 15 - idx * 10, fps, config: { damping: 14 } });
            return (
              <div key={idx} style={{ 
                display: "flex", alignItems: "center", gap: 24, 
                background: "linear-gradient(90deg, rgba(15,23,42,0.8), rgba(0,0,0,0.6))", 
                padding: "24px 30px",
                borderLeft: `4px solid ${activeAccent}`,
                borderRight: `1px solid ${activeAccent}33`,
                borderTop: `1px solid ${activeAccent}33`,
                borderBottom: `1px solid ${activeAccent}33`,
                transform: `translateX(${(1 - itemSpring) * (textAlign === 'right' ? 100 : -100)}px)`, opacity: itemSpring,
                boxShadow: `10px 10px 30px rgba(0,0,0,0.5)`,
                position: "relative"
              }}>
                {/* Tech Detail */}
                <div style={{ position: "absolute", top: -8, left: 20, background: COLORS.bg, color: activeAccent, fontSize: 10, fontFamily: "monospace", padding: "0 8px" }}>
                  [SYS_T+{((idx+1)*0.4).toFixed(2)}]
                </div>
                
                <div style={{ color: activeAccent, display: "flex", alignItems: "center" }}>
                  <ChevronRight size={36} strokeWidth={3} />
                </div>
                <span style={{ 
                  fontSize: 34, fontWeight: 600, color: "#f8fafc", lineHeight: 1.3,
                  fontFamily: "'Inter', 'Montserrat', sans-serif",
                  letterSpacing: -0.5
                }}>
                  {item}
                </span>
                {Math.abs(itemSpring - 1) < 0.1 && idx === Math.min(items.length - 1, Math.floor((scene.localFrame - 15) / 10)) && (
                   <span style={{ width: 14, height: 32, background: activeAccent, marginLeft: 8 }} />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 4. ICON TIER (Mặc định)
    return (
      <div style={{ position: "relative", padding: 20, transform: `translateY(${isFloating ? floatAnim : 0}px)` }}>
        <div style={{
          width: layout.iconSize * 1.8, height: layout.iconSize * 1.8,
          background: "radial-gradient(circle at center, rgba(0,0,0,0.8), rgba(0,0,0,0.4))", 
          position: "relative", zIndex: 2, 
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* 3 Lớp nhẫn xoay siêu công nghệ */}
          <div style={{
             position: "absolute", inset: 0, border: `2px dashed ${activeAccent}88`, borderRadius: "50%",
             transform: `rotate(${frame * 1.5}deg)`, opacity: 0.6
          }}/>
          <div style={{
             position: "absolute", inset: 15, border: `2px dotted ${activeAccent}`, borderRadius: "50%",
             transform: `rotate(${-frame * 2}deg)`, opacity: 0.8
          }}/>
          <div style={{
             position: "absolute", inset: -15, border: `1px solid ${activeAccent}44`, borderRadius: "50%",
             clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
             transform: `rotate(${frame * 0.8}deg)`, opacity: 0.4
          }}/>
          
          {/* Lõi Glow */}
          <div style={{ position: "absolute", width: "60%", height: "60%", background: activeAccent, filter: "blur(30px)", opacity: 0.5 }} />
          
          <IconRender name={src || "cpu"} size={layout.iconSize} color={activeAccent} />
        </div>
      </div>
    );
  };

  // --- RENDER TEXT ---
  const renderTextContent = () => (
    <div style={{ 
      display: "flex", flexDirection: "column", 
      alignItems: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start", 
      textAlign: textAlign, width: "100%",
      position: "relative",
    }}>
      {/* Decorative Text Corner Brackets */}
      {textPosition === "middle" && (
        <>
          <div style={{ position: "absolute", top: -20, left: -20, width: 40, height: 40, borderTop: `2px solid ${activeAccent}66`, borderLeft: `2px solid ${activeAccent}66` }}/>
          <div style={{ position: "absolute", bottom: -20, right: -20, width: 40, height: 40, borderBottom: `2px solid ${activeAccent}66`, borderRight: `2px solid ${activeAccent}66` }}/>
        </>
      )}

      <div style={{ 
        display: "flex", gap: 12, alignItems: "center", marginBottom: 20,
        fontFamily: "'Space Mono', monospace", color: activeAccent, fontSize: 18,
        transform: `translateY(${(1 - textReveal) * 20}px)`, opacity: textReveal,
        background: `${activeAccent}11`, padding: "6px 16px", borderRadius: 4, border: `1px solid ${activeAccent}44`
      }}>
        <div style={{ width: 10, height: 10, background: activeAccent, opacity: 0.85 }} />
        <span>STREAM_LINK_0{scene.index + 1}</span>
      </div>

      <div style={{
        fontSize: activeScene.layout === "intro" ? layout.titleSize + 15 : layout.titleSize,
        lineHeight: 1.15, fontWeight: 900, letterSpacing: -1,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        transform: `translateX(${(1 - textReveal) * (textAlign === 'right' ? 40 : -40)}px)`, opacity: textReveal,
        color: "#fff", textTransform: "uppercase", whiteSpace: "pre-line",
        textShadow: "0 10px 40px rgba(0,0,0,0.8)",
      }}>
        {activeScene.title.split('\n').map((line, i) => (
          <span key={i} style={{ 
            display: "inline-block", 
            background: i === 0 && activeScene.layout !== "intro" ? "transparent" : activeAccent, 
            color: i === 0 && activeScene.layout !== "intro" ? "#f8fafc" : accentTextColor,
            padding: i === 0 && activeScene.layout !== 'intro' ? "0" : "6px 16px",
            marginBottom: 8,
            clipPath: i !== 0 ? "polygon(0 0, 100% 0, 98% 100%, 2% 100%)" : "none" // Tạo khối vát góc nhẹ
          }}>
            {line}
          </span>
        ))}
      </div>
      
      {activeScene.subtitle && (
        <div style={{
          marginTop: 24, fontSize: layout.subtitleSize, lineHeight: 1.5, fontWeight: 500,
          fontFamily: "'Inter', sans-serif", color: "rgba(255, 255, 255, 0.85)",
          opacity: textReveal, transform: `translateX(${(1 - textReveal) * (textAlign === 'right' ? 30 : -30)}px)`, maxWidth: "95%",
          borderLeft: textAlign === 'left' ? `4px solid ${activeAccent}` : "none", 
          borderRight: textAlign === 'right' ? `4px solid ${activeAccent}` : "none", 
          paddingLeft: textAlign === 'left' ? 24 : 0, paddingRight: textAlign === 'right' ? 24 : 0,
          background: textAlign === "right" ? "linear-gradient(270deg, rgba(0,0,0,0.8) 0%, transparent 100%)" : "linear-gradient(90deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
          paddingTop: 16, paddingBottom: 16
        }}>
          {activeScene.subtitle}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: "#050505", color: "#f8fafc", overflow: "hidden", opacity: outroFade }}>
      
      {/* 1. LAYER 0: HỆ THỐNG BACKGROUND CHỐNG TRỐNG TRẢI */}
      {/* Lưới Grid Base */}
      <AbsoluteFill style={{ 
        backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`, 
        backgroundSize: "60px 60px", transform: `translateY(${bgY}px)` 
      }} />
      
      {/* Number Watermark Khổng lồ */}
      <div style={{
        position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)",
        fontSize: 700, fontWeight: 900, color: "transparent", WebkitTextStroke: `2px rgba(255,255,255,0.03)`,
        fontFamily: "'Inter', sans-serif", zIndex: 0, opacity: slideIn
      }}>
        0{scene.index + 1}
      </div>

      {/* Data Streams chạy dọc */}
      <AbsoluteFill style={{ opacity: 0.4 }}>
        {DATA_STREAMS.map(stream => (
          <div key={stream.id} style={{
            position: "absolute", left: `${stream.x}%`, top: `-${((frame + stream.delay) * stream.speed) % 150}%`,
            color: activeAccent, fontFamily: "monospace", fontSize: 12, width: 16, wordWrap: "break-word",
            textShadow: `0 0 10px ${activeAccent}`, opacity: 0.3 + Math.sin(frame/20)*0.2
          }}>
            {buildBinaryColumn(stream.length, stream.id)}
          </div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: `radial-gradient(circle 900px at 50% 50%, ${activeAccent}15, transparent 80%)` }} />
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)", pointerEvents: "none", zIndex: 1 }} />

      {/* 2.5. LAYER 1.5: LÕI HUD TRUNG TÂM (CHỐNG TRỐNG TRẢI) */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none", zIndex: 5, opacity: 0.9 }}>
        {/* Trục Laser dọc nối liền 2 nửa màn hình */}
        <div style={{ position: "absolute", top: "15%", bottom: "15%", width: 1, background: `linear-gradient(to bottom, transparent, ${activeAccent}55, ${activeAccent}55, transparent)` }} />
        
        {/* Vệt dữ liệu chạy dọc trục */}
        <div style={{ 
          position: "absolute", 
          top: `${(frame * 2.5) % 100}%`, 
          width: 4, height: 80, 
          background: activeAccent, 
          boxShadow: `0 0 20px ${activeAccent}, 0 0 40px ${activeAccent}`,
          borderRadius: 10
        }} />

        {/* Radar Lõi (Core Radar) chìm ở giữa background */}
        <div style={{ 
          position: "relative", width: 400, height: 400, 
          display: "flex", justifyContent: "center", alignItems: "center", opacity: 0.15 
        }}>
          {/* Vòng ngoài cùng đứt nét */}
          <div style={{ position: "absolute", inset: 0, border: `3px dashed ${activeAccent}`, borderRadius: "50%", transform: `rotate(${frame * 0.5}deg)` }} />
          {/* Vòng số đo bên trong */}
          <div style={{ position: "absolute", inset: "12%", border: `6px dotted ${activeAccent}`, borderRadius: "50%", transform: `rotate(${-frame * 0.3}deg)`, opacity: 0.5 }} />
          {/* Tâm ngắm (Crosshair) */}
          <div style={{ position: "absolute", inset: "28%", border: `1px solid ${activeAccent}`, borderRadius: "50%", transform: `rotate(${frame * 0.8}deg)` }}>
             <div style={{ position: "absolute", top: "50%", left: "-10%", right: "-10%", height: 1, background: activeAccent, opacity: 0.6 }} />
             <div style={{ position: "absolute", left: "50%", top: "-10%", bottom: "-10%", width: 1, background: activeAccent, opacity: 0.6 }} />
          </div>
          {/* Lõi năng lượng nhịp đập */}
          <div style={{ 
            width: "35%", height: "35%", borderRadius: "50%", 
            background: `radial-gradient(circle, ${activeAccent} 0%, transparent 70%)`, 
            opacity: 0.3 + Math.sin(frame / 10) * 0.4,
            transform: `scale(${1 + Math.sin(frame / 15) * 0.2})`
          }} />
        </div>
      </AbsoluteFill>

      {/* 3. LAYER 2: NỘI DUNG CHÍNH */}
      <AbsoluteFill style={{ 
        paddingLeft: layout.stagePaddingX, paddingRight: layout.stagePaddingX,
        paddingTop: layout.stagePaddingTop, paddingBottom: layout.stagePaddingBottom,
        opacity: 1
      }}>
        <div style={{ 
          width: "100%", height: "100%", display: "flex", 
          flexDirection: textPosition === "bottom" ? "column-reverse" : "column", 
          justifyContent: textPosition === "middle" ? "center" : "space-between", 
          alignItems: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start", 
          gap: textPosition === "middle" ? 80 : 40,
          transform: `translateY(${(1 - slideIn) * 50}px)`, opacity: slideIn * fadeOut,
          position: "relative", zIndex: 10,
        }}>
          
          <div style={{ width: "100%" }}>
            {renderTextContent()}
          </div>

          <div style={{ width: "100%", display: "flex", justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" }}>
            {renderVisualContent()}
          </div>

        </div>

        {/* CALL TO ACTION */}
        {activeScene.layout === "outro" && (
          <div style={{ position: "absolute", bottom: layout.stagePaddingBottom / 1.5, left: layout.stagePaddingX, right: layout.stagePaddingX, display: "flex", justifyContent: textAlign }}>
            <div style={{ 
              display: "inline-flex", alignItems: "center", gap: 16, 
              background: withAlpha(activeAccent, "E6"), padding: "24px 48px", 
              border: `2px solid ${accentTextColor === "#000000" ? "#111827" : "#ffffff"}`,
              boxShadow: `10px 10px 0px rgba(255,255,255,0.2), 0 0 50px ${activeAccent}66`, 
              transform: `translateY(${(1 - spring({ frame: scene.localFrame, fps, config: { damping: 12 } })) * 40}px) scale(${1 + Math.sin(frame/10)*0.03})`,
            }}>
              <Fingerprint size={32} color={accentTextColor} strokeWidth={2.5} />
              <span style={{ color: accentTextColor, letterSpacing: 2, fontFamily: "'Space Mono', monospace", fontSize: layout.chipSize + 4, fontWeight: 900 }}>
                {cta}
              </span>
            </div>
          </div>
        )}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};