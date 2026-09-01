/**
 * Cue hooks — anchor animations to the spoken word instead of a guessed frame.
 *
 * Instead of:      <FocusBox startFrame={45} />       // breaks when the script changes
 * Write:           <FocusBox startFrame={useCue("03-conv", "window")} />
 *
 * Cues are declared in script.json and resolved to real frames by
 * scripts/align_captions.py, so re-recording the narration re-times the
 * animation automatically.
 *
 * All frames returned here are SCENE-RELATIVE, matching what useCurrentFrame()
 * reports inside the scene's <Sequence>.
 */

import { useCurrentFrame } from "remotion";
import { CAPTIONS_BY_ID, type CaptionWord, type SceneCaptions } from "./generated/captions";
import { SCENES, getSceneStart } from "./generated/audioConfig";

export function getSceneCaptions(sceneId: string): SceneCaptions {
  const scene = CAPTIONS_BY_ID[sceneId];
  if (!scene) {
    throw new Error(
      `Không có caption cho scene "${sceneId}". ` +
        `Chạy: python scripts/generate_audio.py && python scripts/align_captions.py`,
    );
  }
  return scene;
}

/**
 * Scene-relative frame at which `name` is spoken.
 * Falls back to `fallback` (default 0) when the cue was not found, so a typo in
 * script.json degrades into "starts immediately" rather than a crash.
 */
export function cueFrame(sceneId: string, name: string, fallback = 0): number {
  const frame = getSceneCaptions(sceneId).cues[name];
  if (frame === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[cue] "${name}" không tồn tại trong scene "${sceneId}" — dùng ${fallback}.`);
    }
    return fallback;
  }
  return frame;
}

/** Hook form of {@link cueFrame}. */
export function useCue(sceneId: string, name: string, fallback = 0): number {
  return cueFrame(sceneId, name, fallback);
}

/** True once the cue has been spoken. Handy for conditional rendering. */
export function useAfterCue(sceneId: string, name: string, offset = 0): boolean {
  const frame = useCurrentFrame();
  return frame >= cueFrame(sceneId, name) + offset;
}

/**
 * Progress 0→1 between two cues — for animations that must span exactly the
 * stretch of narration that describes them.
 */
export function useCueProgress(sceneId: string, from: string, to: string): number {
  const frame = useCurrentFrame();
  const scene = getSceneCaptions(sceneId);
  const start = cueFrame(sceneId, from);
  const end = scene.cues[to] ?? scene.durationInFrames;
  if (end <= start) return frame >= start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - start) / (end - start)));
}

/** Index of the word being spoken right now, or -1 before speech starts. */
export function useSpokenWordIndex(sceneId: string): number {
  const frame = useCurrentFrame();
  const { words } = getSceneCaptions(sceneId);
  for (let i = words.length - 1; i >= 0; i--) {
    if (frame >= words[i].startFrame) return i;
  }
  return -1;
}

/** The subtitle line active at the current frame, if any. */
export function useCurrentLine(sceneId: string) {
  const frame = useCurrentFrame();
  return getSceneCaptions(sceneId).lines.find(
    (l) => frame >= l.startFrame && frame <= l.endFrame,
  );
}

export function useSceneWords(sceneId: string): CaptionWord[] {
  return getSceneCaptions(sceneId).words;
}

/** Index of the scene playing at an absolute timeline frame. */
export function useSceneIndex(): number {
  const frame = useCurrentFrame();
  let acc = 0;
  for (let i = 0; i < SCENES.length; i++) {
    acc += SCENES[i].durationInFrames;
    if (frame < acc) return i;
  }
  return SCENES.length - 1;
}

export { getSceneStart };
