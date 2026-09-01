/**
 * Frame-accurate subtitles driven by src/generated/captions.ts.
 *
 * The wording comes from script.json (always correctly spelled); the timing
 * comes from Whisper. See scripts/align_captions.py.
 *
 * Usage — inside a scene's <Sequence>:
 *     <Captions sceneId="03-conv" />
 *
 * Usage — once at the top level, covering every scene:
 *     <CaptionsTrack />
 *
 * Font note: Vietnamese needs full diacritic coverage. Load a real font rather
 * than relying on the fallback stack:
 *     import { loadFont } from "@remotion/google-fonts/BeVietnamPro";
 *     const { fontFamily } = loadFont();
 *     <Captions sceneId="03-conv" fontFamily={fontFamily} />
 */

import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS, type SceneCaptions } from "./generated/captions";
import { getSceneCaptions } from "./useCue";

const FONT_STACK =
  '"Be Vietnam Pro", "Inter", "Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

export type CaptionMode =
  /** The whole line appears at once. Calmest; best for dense visuals. */
  | "line"
  /** The line is present but the spoken word is highlighted. Best default. */
  | "karaoke"
  /** Words appear one at a time as they are spoken. Most attention-grabbing. */
  | "reveal";

export interface CaptionsProps {
  sceneId: string;
  mode?: CaptionMode;
  /** Distance from the bottom edge, in pixels of the composition. */
  bottom?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  /** Colour of the word currently being spoken (karaoke / reveal). */
  highlightColor?: string;
  /** Colour of words not yet spoken (karaoke). */
  dimColor?: string;
  background?: string;
  maxWidth?: number | string;
  /** Frames spent fading a line in and out. */
  fade?: number;
  style?: React.CSSProperties;
}

export const Captions: React.FC<CaptionsProps> = ({
  sceneId,
  mode = "karaoke",
  bottom = 90,
  fontSize = 44,
  fontFamily = FONT_STACK,
  color = "#FFFFFF",
  highlightColor = "#FFD84D",
  dimColor = "rgba(255,255,255,0.45)",
  background = "rgba(0,0,0,0.62)",
  maxWidth = "78%",
  fade = 5,
  style,
}) => {
  const frame = useCurrentFrame();
  const scene = getSceneCaptions(sceneId);

  const line = scene.lines.find((l) => frame >= l.startFrame && frame <= l.endFrame);
  if (!line) return null;

  // interpolate() requires a strictly increasing input range. A short line
  // (duration <= 2*fade) would make startFrame+fade collide with or pass
  // endFrame-fade, so shrink the fade to fit -- and skip it entirely rather
  // than dividing a 1-frame line into four identical points.
  const lineDuration = line.endFrame - line.startFrame;
  const effectiveFade = Math.min(fade, Math.floor((lineDuration - 1) / 2));
  const opacity =
    effectiveFade > 0
      ? interpolate(
          frame,
          [
            line.startFrame,
            line.startFrame + effectiveFade,
            line.endFrame - effectiveFade,
            line.endFrame,
          ],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1;

  const words = scene.words.slice(line.wordStart, line.wordEnd + 1);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: bottom,
        pointerEvents: "none",
        ...style,
      }}
    >
      <div
        style={{
          maxWidth,
          padding: "14px 30px",
          borderRadius: 14,
          background,
          opacity,
          textAlign: "center",
          fontFamily,
          fontSize,
          fontWeight: 600,
          lineHeight: 1.35,
          color,
          // Keeps text readable over bright or busy footage.
          textShadow: "0 2px 10px rgba(0,0,0,0.75)",
        }}
      >
        {mode === "line"
          ? line.text
          : words.map((word, i) => {
              const spoken = frame >= word.startFrame;
              const active = spoken && frame <= word.endFrame;

              if (mode === "reveal" && !spoken) return null;

              return (
                <span
                  key={`${word.startFrame}-${i}`}
                  style={{
                    color: active ? highlightColor : spoken ? color : dimColor,
                    transition: "none",
                  }}
                >
                  {word.text}
                  {i < words.length - 1 ? " " : ""}
                </span>
              );
            })}
      </div>
    </AbsoluteFill>
  );
};

export interface CaptionsTrackProps extends Omit<CaptionsProps, "sceneId"> {
  /** Render captions only for these scenes. Defaults to all of them. */
  only?: string[];
}

/**
 * Drop this in once at the root — it wraps every scene's captions in its own
 * <Sequence> so the frame numbers line up without any manual bookkeeping.
 */
export const CaptionsTrack: React.FC<CaptionsTrackProps> = ({ only, ...props }) => {
  const scenes: SceneCaptions[] = only
    ? CAPTIONS.filter((c) => only.includes(c.id))
    : CAPTIONS;

  return (
    <>
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
          name={`Captions: ${scene.id}`}
        >
          <Captions sceneId={scene.id} {...props} />
        </Sequence>
      ))}
    </>
  );
};
