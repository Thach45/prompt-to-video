/**
 * Shared scene chrome: safe-area frame, ambient drifting background, and a
 * spring entrance -- so every scene in a video looks consistent by
 * construction instead of each one reinventing its own polish (or skipping
 * it). Wrap each scene's content in <SceneLayout>...</SceneLayout>.
 */
import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK } from "./theme";

/** Soft blurred color blobs drifting behind the content -- purely ambient. */
const AmbientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const blob = (phaseX: number, phaseY: number, speedX: number, speedY: number, color: string, size: number) => {
    const x = 50 + Math.sin(frame * speedX + phaseX) * 30;
    const y = 50 + Math.cos(frame * speedY + phaseY) * 24;
    return (
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: "50%",
          background: color,
          filter: "blur(120px)",
          opacity: 0.22,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {blob(0, 1.5, 0.006, 0.005, COLORS.positive, 700)}
      {blob(3, 0, 0.005, 0.007, COLORS.accent, 600)}
    </AbsoluteFill>
  );
};

export interface SceneLayoutProps {
  children: React.ReactNode;
  /** Small caption-style label above the content, e.g. a scene chapter name. */
  hook?: string;
  /**
   * Safe-area insets in composition pixels. Defaults assume a 1080x1920
   * TikTok/Reels/Shorts vertical composition, where the platform's own UI
   * covers roughly the top ~180px (profile/follow) and bottom ~380px
   * (caption text, music ticker, right-side icon rail). Pass narrower insets
   * for a 16:9 or 1:1 composition that has no such chrome to avoid.
   */
  safeTop?: number;
  safeBottom?: number;
  safeSide?: number;
}

export const SceneLayout: React.FC<SceneLayoutProps> = ({
  children,
  hook,
  safeTop = 220,
  safeBottom = 380,
  safeSide = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <AmbientBackground />
      <AbsoluteFill
        style={{
          top: safeTop,
          bottom: safeBottom,
          left: safeSide,
          right: safeSide,
          // AbsoluteFill defaults to width/height:100%, which -- combined
          // with top+bottom+left+right all being set here -- over-constrains
          // the box. The browser then drops bottom/right and sizes from
          // width/height:100% of the SCREEN instead, silently ballooning
          // this box past the intended safe area and skewing every
          // "centered" child down and to the right. Force auto so the size
          // is derived from the insets instead.
          width: "auto",
          height: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: enter,
          transform: `scale(${0.9 + 0.1 * enter})`,
        }}
      >
        {children}
      </AbsoluteFill>
      {hook && (
        <div
          style={{
            position: "absolute",
            top: safeTop - 70,
            left: safeSide,
            right: safeSide,
            textAlign: "center",
            fontFamily: FONT_STACK,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.neutral,
            letterSpacing: 1,
            opacity: enter,
          }}
        >
          {hook}
        </div>
      )}
    </AbsoluteFill>
  );
};
