---
name: remotion-video
description: |
  Create videos programmatically with the Remotion framework. Define scenes with React
  components, add AI narration, auto-generate frame-accurate captions, and self-review
  with rendered stills before committing to a full render.
  Trigger phrases:
  - "make a video with code", "programmatic video", "React video", "AI narrated video", "auto captions"
  - "用代码做视频"、"编程视频"、"React 视频"、"AI 配音视频"、"自动字幕"
  - "làm video bằng code"、"video giải thích"、"lồng tiếng AI"、"phụ đề tự động"
  - "Remotion"、"remotion"、"VieNeu"
  - "/remotion-video"
  Use cases:
  - Programmatic video: (1) batch generation (2) data-driven (e.g. year-in-review) (3) music visualization (4) auto captions
  - Tutorial/explainer video: (5) visualizing technical concepts (CNNs, algorithms) (6) layered step-by-step explanation (7) AI-narrated tutorials
  - 3D video: (8) product showcase / model animation (9) cartoon character explainer (10) 3D data visualization (11) logo animation
  Built-in capabilities:
  - Three TTS backends: VieNeu-TTS (local / Vietnamese / voice cloning), MiniMax (cloud / Chinese), Edge TTS (free fallback)
  - Whisper forced alignment → correctly spelled captions + speech cues that drive animation
  - Preview loop: render stills and actually look at them before committing to a full render
---

# Remotion Video

A framework for creating MP4 videos programmatically with React.

## Core Concepts

1. **Composition** - the video's definition (dimensions, frame rate, duration)
2. **useCurrentFrame()** - get the current frame number, drives animation
3. **interpolate()** - map a frame number to any value (position, opacity, etc.)
4. **spring()** - physics-based animation
5. **<Sequence>** - arrange components along the timeline

## Quick Start

### Create a new project

```bash
npx create-video@latest
```

After picking a template:

```bash
cd <project-name>
npm run dev  # launch Remotion Studio preview
```

### Project structure

```
my-video/
├── src/
│   ├── Root.tsx           # registers all Compositions
│   ├── HelloWorld.tsx     # video component
│   └── index.ts           # entry point
├── public/                # static assets (audio, images)
├── remotion.config.ts     # config file
└── package.json
```

## Basic Component Examples

### Minimal video component

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ fontSize: 100 }}>Frame {frame}</h1>
    </AbsoluteFill>
  );
};
```

### Registering a Composition

```tsx
// Root.tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}  // 5s @ 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

## Animation Techniques

### interpolate - value mapping

```tsx
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// frames 0-30: opacity 0→1
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",  // clamp when out of range
});

// translation animation
const translateY = interpolate(frame, [0, 30], [50, 0]);
```

### spring - physics-based animation

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame,
  fps,
  config: { damping: 10, stiffness: 100 },
});
```

### Sequence - timeline arrangement

```tsx
import { Sequence } from "remotion";

<>
  <Sequence from={0} durationInFrames={60}>
    <Intro />
  </Sequence>
  <Sequence from={60} durationInFrames={90}>
    <MainContent />
  </Sequence>
  <Sequence from={150}>
    <Outro />
  </Sequence>
</>
```

## Narration, Captions & Preview (Core Workflow)

Three scripts, one pipeline. **The only source of truth is `script.json`** at the project
root — everything else is generated.

```
script.json  ──generate_audio.py──▶  public/audio/*.mp3
                                     src/generated/audioConfig.ts
             ──align_captions.py──▶  src/generated/captions.ts   (captions + cues)
             ──preview.py─────────▶  out/preview/*.png           (look before you render)
```

```bash
python scripts/generate_audio.py     # 1. narration (incremental — only regenerates changed content)
python scripts/align_captions.py     # 2. caption alignment + speech cues
python scripts/preview.py            # 3. sparse-frame preview — do this before every render
npx remotion render Main out/video.mp4
```

### script.json

```json
{
  "compositionId": "Main",
  "fps": 30,
  "lang": "vi",
  "voice": { "provider": "auto" },
  "scenes": [
    {
      "id": "03-conv",
      "title": "Convolution",
      "text": "This window covers nine pixels. We multiply each pixel by its matching weight, then add everything up.",
      "cues": { "window": "This window", "multiply": "multiply", "sum": "add everything" }
    }
  ]
}
```

- `text` — the narration, and also the source of the caption text (always spelled correctly)
- `cues` — **speech anchors** for animation: `name → a phrase in the narration`
- Each scene can add `"voice": "..."` to override the voice, for multi-character dialogue

Start from the template:

```bash
cp templates/script.example.json script.json
cp templates/src/useCue.ts templates/src/Captions.tsx src/
mkdir -p voices && cp templates/voices/nhat-phong.wav voices/
```

The template's default narration is already a cloned voice — `templates/voices/nhat-phong.wav`
(male, narrative style), wired up via `ref_audio` + `clone_name` in `script.example.json`.
Run `generate_audio.py` with no changes and you'll hear this voice immediately.
To switch back to a built-in preset voice, see the `_comment_preset` block in `script.example.json`.

---

### TTS Options Compared

| Option | Language | Voice Cloning | Cost | Hardware | Recommendation |
|------|------|----------|------|------|--------|
| **VieNeu-TTS** | Vietnamese / English | ✅ instant clone from a 3–8s sample | Free (Apache 2.0) | CPU is enough; ~7× realtime on Apple Silicon | ⭐⭐⭐ first choice for Vietnamese |
| **MiniMax TTS** | Chinese + many others | ✅ cloud cloning | Billed per character | None (cloud) | ⭐⭐⭐ first choice for Chinese |
| **Edge TTS** | Many languages | ❌ fixed voices | Free | None (cloud) | ⭐⭐ fallback |

> The template is already configured with a VieNeu cloned voice (above) — no extra setup needed to hear it.

`"provider": "auto"` picks a backend based on what's **actually available** on the machine:

```
lang is vi / en   →  vieneu → minimax → edge
other languages    →  minimax → edge          (VieNeu only supports Vietnamese/English)
```

You can also force a specific one: `python scripts/generate_audio.py --provider edge`

#### VieNeu-TTS (local, Vietnamese)

```bash
pip install vieneu          # CPU / macOS
# GPU: install PyTorch (CUDA>=12.8) first, then pip install vieneu
```

**⚠️ Voice IDs depend on `mode`** — the two voice sets are completely different:

| mode | Sample rate | # voices | ID format | Default |
|------|--------|--------|---------|------|
| `v3turbo` (default) | 48 kHz | 20 | **carries tone marks**, e.g. `"Phạm Tuyên"` | `Adam` |
| `standard` | 24 kHz | 6 | no tone marks, e.g. `"Tuyen"` | `Binh` |

Don't copy voice names from docs — **ask the engine directly**:

```bash
python scripts/generate_audio.py --list-voices
```

The 20 v3turbo voices, grouped by accent:

- **Northern**: Minh Đức, Phạm Tuyên, Thanh Bình, Trúc Ly, Ngọc Linh, Đoan Trang, Mai Anh, Quỳnh Anh, Ngọc Huyền
- **Central**: Quang Sơn, Ngọc Trân
- **Southern**: Adam, Thái Sơn, Xuân Vĩnh, Minh Triết, Thục Đoan, Thùy Dung, Mỹ Duyên, Đức Trí, Kim Thanh

Other things worth knowing:

- **Voice cloning**: `"ref_audio": "voices/me.wav"` (3–8s of clean speech) + optional `"clone_name"`.
  The script calls `add_voice()` once at startup and reuses it — it does not re-encode the
  reference clip per scene. Cloning under `mode: "standard"` also needs a transcript of the
  reference audio (`infer`'s `ref_text`); the default `v3turbo` uses ref codes and doesn't need one.
- **Watermarking is on by default**: `infer(apply_watermark=True)` is the default. To turn it
  off, set `"infer": { "apply_watermark": false }` — and make sure that's consistent with the
  license and ethics requirements of your project.
- Experimental emotion tags: `[cười]` laugh, `[thở dài]` sigh, `[hắng giọng]` throat-clear
- Supports Vietnamese/English code-switching, so English technical terms aren't mispronounced
- Outputs wav (numpy float32); the script auto-converts to mp3 to keep `public/` small
- Engine parameters pass straight through: `backend` (auto/onnx/pytorch), `device`, `precision`
  (int8/fp32), `threads`; inference parameters go in `"infer": {...}`
- Repo: https://github.com/pnnbao97/VieNeu-TTS

#### MiniMax TTS (cloud, Chinese)

```bash
export MINIMAX_API_KEY="..."
export MINIMAX_VOICE_ID="..."
```

| Region | API host |
|------|----------|
| Global | `api.minimax.io` (`"region": "global"`, default) |
| China | `api.minimaxi.com` (`"region": "cn"`) |

**⚠️ `api.minimax.chat` is the wrong host** — it returns "invalid api key".

Pricing: `speech-02-hd` ¥0.1/1000 chars, `speech-02-turbo` ¥0.05/1000 chars.
Run `--dry-run` first to see the estimated cost before spending anything.

#### Edge TTS (cloud, free fallback)

```bash
pip install edge-tts
```

| Voice ID | Language | Style |
|---------|------|------|
| vi-VN-NamMinhNeural | Vietnamese | male (default) |
| vi-VN-HoaiMyNeural | Vietnamese | female |
| zh-CN-YunyangNeural | Chinese | professional broadcast |
| zh-CN-XiaoxiaoNeural | Chinese | warm and natural |
| en-US-AndrewNeural | English | natural male |

---

### Incremental Generation (Resume)

`generate_audio.py` tracks each scene's **content hash + voice signature** in
`public/audio/.manifest.json`. A scene only regenerates when:

- `text` changed
- the voice / provider changed
- the audio file was deleted

```bash
python scripts/generate_audio.py --only 03-conv   # redo just one scene
python scripts/generate_audio.py --force          # redo everything
python scripts/generate_audio.py --dry-run        # just show the plan and cost estimate
```

> **⚠️ This is a real bug from the old version**: the previous script only checked
> "does the mp3 file exist". Edit the narration and rerun, and it would **silently keep
> the stale audio**, permanently desyncing picture and sound. It now hashes content, so
> editing the text always triggers a regeneration.

---

## Captions and Speech Cues

### Why not just transcribe with Whisper

We **already know what was said** — we wrote the narration ourselves. Whisper is good at
figuring out *when* a word was spoken, but what it writes down is often wrong: Vietnamese
tone marks, "twenty" transcribed as "20", spelling of code-switched English terms.

So `align_captions.py` does **forced alignment** instead:

```
timestamps ← Whisper
wording    ← script.json
             ↓
the two sequences are aligned with difflib; anything Whisper missed is
linearly interpolated from its neighbors' timing
```

Result: captions are always spelled correctly, and every word has a frame-accurate timestamp.

```bash
pip install faster-whisper            # recommended, much faster than openai-whisper
python scripts/align_captions.py
python scripts/align_captions.py --model small   # faster, slightly less accurate
```

In the generated `src/generated/captions.ts`, **every frame number is scene-relative**,
matching the semantics of `useCurrentFrame()` inside a `<Sequence>`.

### Rendering captions

```tsx
import { CaptionsTrack } from "./Captions";

// drop it once at the root — covers every scene automatically
<CaptionsTrack mode="karaoke" />

// or inside a single scene's Sequence
<Captions sceneId="03-conv" mode="karaoke" />
```

| mode | effect | best for |
|------|------|------|
| `line` | the whole line appears at once | when the visuals are already dense |
| `karaoke` | the line stays put, the spoken word is highlighted | **default, most recommended** |
| `reveal` | words appear one at a time | when you need to strongly pull attention |

**Vietnamese font**: you must load a font with full tone-mark coverage — don't rely on the
system fallback stack.

```tsx
import { loadFont } from "@remotion/google-fonts/BeVietnamPro";
const { fontFamily } = loadFont();
<CaptionsTrack fontFamily={fontFamily} />
```

### Driving Animation with Cues (Important)

This is this skill's single most important architectural principle:

```tsx
// ❌ hardcoded frame number -- breaks the moment the narration changes
<FocusBox startFrame={45} />

// ✅ anchored to a phrase -- re-recording the narration keeps the animation in sync
import { useCue, useCueProgress, useAfterCue } from "./useCue";

<FocusBox startFrame={useCue("03-conv", "window")} />
```

Available hooks:

| Hook | Returns | Use for |
|------|------|------|
| `useCue(sceneId, name)` | scene-relative frame | when an element should enter |
| `useAfterCue(sceneId, name, offset?)` | boolean | conditional rendering |
| `useCueProgress(sceneId, from, to)` | 0→1 | an animation that should span exactly that stretch of narration |
| `useSpokenWordIndex(sceneId)` | index of the current word | karaoke-style highlighting |
| `useCurrentLine(sceneId)` | the current caption line | custom caption styling |

Typical usage — making a sliding-window animation track exactly the "multiply ... add up" clause:

```tsx
const Scene03: React.FC = () => {
  const step = useCueProgress("03-conv", "multiply", "sum");
  const showResult = useAfterCue("03-conv", "sum");

  return (
    <group>
      <SlidingWindow currentStep={Math.floor(step * 9)} />
      {showResult && <ValueFlyIn value={2.4} startFrame={useCue("03-conv", "writeOut")} />}
    </group>
  );
};
```

A missing cue doesn't crash — it falls back to 0 and warns in the console.
`align_captions.py` also lists any cues it couldn't find after it finishes (usually because
the phrase in `cues` doesn't match `text` verbatim).

---

## The Preview Loop (Do This Before Every Render)

**The problem**: writing video code is "flying blind" — you can only see the result after
a full render, minutes later, and most bugs (an image rotated 90°, a jittering camera, text
running off-screen, elements all appearing at once) are **obvious at a glance and invisible
in the source**.

**The fix**: render sparse frames at low resolution, in seconds, and **actually look at them**.

```bash
python scripts/preview.py                      # 3 frames per scene
python scripts/preview.py --frames-per-scene 5
python scripts/preview.py --scenes 03-conv     # just one scene
python scripts/preview.py --at 0,120,450       # specific absolute frames
python scripts/preview.py --scale 0.6          # bump up when checking detail
```

Outputs individual PNGs under `out/preview/`, plus one `_sheet.png` contact sheet stitching
them together — **looking at that one image shows every sampled frame at once**, far less
tedious than opening them one by one.

> Labels on the contact sheet need ffmpeg's `drawtext` filter (many Homebrew builds ship
> without libfreetype) or Pillow. Without either, the stills still render, just without the
> burned-in label — the filename still carries the scene and frame number. `pip install pillow`
> fixes it.
Frame positions are derived from **real audio duration**, so what gets sampled is the actual
start/middle/end of each scene.

### Self-review checklist

Go through this while looking at the images (the script also prints it after it finishes):

| Dimension | Check |
|------|------|
| Layout | Does any text run off-frame? Is it inside the safe zone? Is the smallest text still legible at 1080p? |
| Orientation | Is any grid/image rotated or mirrored? (`row→y`, `col→x`, and y must be flipped) |
| Pacing | Do elements appear one at a time, or all at once? Is the first frame of a scene empty? |
| Camera | Compare two adjacent frames — any subtle jitter or zoom drift? |
| Color | Does color carry meaning, or is it just decoration? |
| Content | Does each scene cover exactly one concept? Do the numbers make sense (progress >100% means a missing clamp)? |

3D scenes default to `--gl=angle` (see "WebGL Context Overflow").

**Iteration rhythm**: `edit code → preview → look → edit again`, only committing to a full
render once it looks right. Sampling 12 frames takes roughly ten seconds; a full render takes
several minutes — the preview step is almost always worth it.

---

## Tutorial Video Architecture (Scene-Driven)

The core architecture for tutorial/explainer videos: **audio-driven scene switching**.

### Architecture Overview

```
script.json → TTS generation → audioConfig.ts ┐
                              → captions.ts    ┴→ scene components → preview stills → video render
```

Key ideas:
1. **Audio decides duration**: every scene's length comes from its audio length — never hardcoded
2. **A scene is a chapter**: one concept = one scene = one audio clip
3. **Config is the source of truth**: `script.json` is the only hand-edited file; everything in `src/generated/` is generated
4. **Anchor to the narration**: time animations inside a scene with cues, not frame numbers (see "Captions and Speech Cues")

### Generated Output

`src/generated/audioConfig.ts` (written by `generate_audio.py` — do not edit by hand):

| Export | Description |
|------|------|
| `SCENES` | array of scenes: `id` / `title` / `durationInFrames` / `audioFile` / `durationInSeconds` |
| `getSceneStart(i)` | absolute start frame of the i-th scene |
| `getSceneIndexAtFrame(f)` | which scene an absolute frame falls into |
| `FPS` / `TAIL_FRAMES` / `TOTAL_FRAMES` | frame rate and total duration |

### Scene-switching hook

The switching logic is already in the generated config — just use it directly:

```tsx
import { useSceneIndex } from "./useCue";
import { SCENES } from "./generated/audioConfig";

const sceneIndex = useSceneIndex();
const currentScene = SCENES[sceneIndex];
```

### Root scene component pattern

```tsx
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { SCENES, getSceneStart } from "./generated/audioConfig";
import { useSceneIndex } from "./useCue";
import { CaptionsTrack } from "./Captions";

export const TutorialVideo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const sceneIndex = useSceneIndex();
  const currentScene = SCENES[sceneIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
      {/* 3D content -- only ever mount ONE ThreeCanvas at a time, to avoid WebGL context overflow */}
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 4], fov: 50 }}>
        {sceneIndex === 0 && <Scene01Intro />}
        {sceneIndex === 1 && <Scene02Concept />}
        {sceneIndex === 2 && <Scene03Demo />}
      </ThreeCanvas>

      {/* audio sync - one Sequence per scene */}
      {SCENES.map((scene, idx) => (
        <Sequence key={scene.id} from={getSceneStart(idx)} durationInFrames={scene.durationInFrames}>
          <Audio src={staticFile(`audio/${scene.audioFile}`)} />
        </Sequence>
      ))}

      {/* captions: one line, frame numbers come from captions.ts */}
      <CaptionsTrack mode="karaoke" />

      {/* UI layer: title + progress */}
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center" }}>
        <h1 style={{ color: "white", fontSize: 42 }}>Tutorial Title</h1>
      </div>
      <div style={{ position: "absolute", bottom: 60, left: 60 }}>
        <span style={{ color: "white" }}>{currentScene?.title}</span>
      </div>
      {/* progress bar */}
      <div style={{ position: "absolute", bottom: 30, left: 60, right: 60, height: 4, backgroundColor: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${((sceneIndex + 1) / SCENES.length) * 100}%`, height: "100%", backgroundColor: "#3498DB" }} />
      </div>
    </AbsoluteFill>
  );
};
```

### Root.tsx with a dynamic frame count

```tsx
import { Composition } from "remotion";
import { TutorialVideo } from "./TutorialVideo";
import { TOTAL_FRAMES } from "./generated/audioConfig";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Tutorial"
      component={TutorialVideo}
      fps={30}
      durationInFrames={TOTAL_FRAMES}  // derived dynamically from audioConfig
      width={1920}
      height={1080}
    />
  );
};
```

### ⚠️ Tutorial Video Lessons Learned

| Problem | Cause | Fix |
|------|------|----------|
| Scene transitions feel abrupt | hard cut with no transition | add an entrance animation with spring/interpolate |
| 3D content desyncs from audio | hardcoded frame counts | read every duration from audioConfig |
| WebGL crashes during render | multiple ThreeCanvas instances alive at once | conditionally render by sceneIndex, only one 3D scene at a time |
| Video feels too simple/sparse | just one big scene | **one concept = one scene component**, layer the explanation |
| Visuals are flat, not eye-catching | static solid-color background + hard scene cuts | use `templates/src/SceneLayout.tsx`, see below |

### Scene shell: SceneLayout (safe zone + ambient background + entrance animation)

```bash
cp templates/src/SceneLayout.tsx templates/src/theme.ts src/
```

Wrap every scene component in `<SceneLayout>` and get three things for free:

```tsx
import { SceneLayout } from "./SceneLayout";

const Scene03: React.FC = () => (
  <SceneLayout hook="How convolution works">
    {/* scene content */}
  </SceneLayout>
);
```

- **Safe zone**: defaults assume a 1080×1920 vertical composition (TikTok/Reels/Shorts) —
  reserving ~180px at the top (avatar/follow button) and ~380px at the bottom (caption text,
  music ticker, right-side like/share rail). For 16:9 or 1:1 video, pass smaller
  `safeTop`/`safeBottom`/`safeSide` values.
- **Ambient background**: two blurred color blobs drift via sin/cos — turns a flat static
  background "alive" instantly.
- **Entrance spring**: every scene scales up from 90% and fades in, replacing a hard cut.

Pair it with a single global progress bar in the root component for a much more polished feel:

```tsx
// A root component like BackpropVideo.tsx -- note that useCurrentFrame() here is the
// GLOBAL absolute frame, since this is not inside any <Sequence>, so it's a real
// whole-video progress value.
const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / TOTAL_FRAMES);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.08)" }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", background: COLORS.highlight }} />
    </div>
  );
};
```

**Only use motion where it means something**: give an edge/node that's "currently happening"
a breathing glow or a flowing dashed line; keep "settled/inactive" ones still — motion itself
is a form of semantics. Don't animate every element at once, or the viewer won't know where
to look (echoing the 3B1B principle above).

### Scene Component Design Principles

1. **Single responsibility**: each scene component covers exactly one concept
2. **Independent animation**: each scene has its own `useCurrentFrame()`, animation starts from 0
3. **Staggered appearance**: use a `delay` parameter to make elements appear one after another
4. **Camera adaptation**: different scenes may need different camera positions

```tsx
// example scene component
const Scene02Input: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // entrance animation
  const gridScale = spring({ frame, fps, config: { damping: 15 } });

  return (
    <group>
      <PixelGrid position={[0, 0, 0]} scale={gridScale * 1.5} />
    </group>
  );
};
```

### Camera Controller Pattern

```tsx
import { useThree } from "@react-three/fiber";

// ✅ Recommended: set the camera position directly, avoiding the persistent jitter that interpolation causes
const CameraController: React.FC<{ sceneIndex: number }> = ({ sceneIndex }) => {
  const { camera } = useThree();

  const cameraSettings: Record<number, [number, number, number]> = {
    0: [0, 0, 4],      // opening: front-on
    1: [0, 0, 3],      // input layer: close up
    2: [-0.5, 0, 3.5], // convolution: offset left
    3: [0, 0, 5],      // summary: pull back for a wide shot
  };

  const target = cameraSettings[sceneIndex] || [0, 0, 4];

  // set the position directly, no interpolation
  camera.position.set(target[0], target[1], target[2]);
  camera.lookAt(0, 0, 0);

  return null;
};
```

⚠️ **Don't write `position += (target - position) * factor`** — it never converges exactly,
and causes persistent jitter. See "🚨 Common 3D Scene Pitfalls - Pitfall 1" below.

---

## Common Features

### Adding video/audio

```tsx
import { Video, Audio, staticFile } from "remotion";

// files under public/
<Video src={staticFile("background.mp4")} />
<Audio src={staticFile("music.mp3")} volume={0.5} />

// external URL
<Video src="https://example.com/video.mp4" />
```

### Adding images

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("logo.png")} style={{ width: 200 }} />
```

### Parameterized video (dynamic data)

```tsx
// define the props schema
const myCompSchema = z.object({
  title: z.string(),
  bgColor: z.string(),
});

export const MyVideo: React.FC<z.infer<typeof myCompSchema>> = ({ title, bgColor }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <h1>{title}</h1>
    </AbsoluteFill>
  );
};

// pass default values at registration
<Composition
  id="MyVideo"
  component={MyVideo}
  schema={myCompSchema}
  defaultProps={{ title: "Hello", bgColor: "#ffffff" }}
  ...
/>
```

## Rendering Output

### CLI rendering

```bash
# render to MP4
npx remotion render MyVideo out/video.mp4

# specify a codec
npx remotion render --codec=h264 MyVideo out/video.mp4

# WebM format
npx remotion render --codec=vp8 MyVideo out/video.webm

# GIF
npx remotion render --codec=gif MyVideo out/video.gif

# audio only
npx remotion render --codec=mp3 MyVideo out/audio.mp3

# image sequence
npx remotion render --sequence MyVideo out/frames

# a single still frame
npx remotion still MyVideo --frame=30 out/thumbnail.png
```

### Common render flags

| Flag | Description |
|------|------|
| `--codec` | h264, h265, vp8, vp9, gif, mp3, wav, etc. |
| `--crf` | quality (0-51, lower is better, default 18) |
| `--props` | pass props as JSON |
| `--scale` | scale factor |
| `--concurrency` | parallel render workers |

## Advanced Features

### Captions (@remotion/captions)

```bash
npm i @remotion/captions @remotion/install-whisper-cpp
npx remotion-install-whisper-cpp  # install Whisper
```

```ts
import { transcribe } from "@remotion/install-whisper-cpp";

const { transcription } = await transcribe({
  inputPath: "audio.mp3",
  whisperPath: whisperCppPath,
  model: "medium",
});
```

### Embedding the player in a web app

```bash
npm i @remotion/player
```

```tsx
import { Player } from "@remotion/player";
import { MyVideo } from "./MyVideo";

<Player
  component={MyVideo}
  durationInFrames={150}
  fps={30}
  compositionWidth={1920}
  compositionHeight={1080}
  style={{ width: "100%" }}
  controls
  inputProps={{ title: "Dynamic Title" }}
/>
```

### AWS Lambda rendering

```bash
npm i @remotion/lambda
npx remotion lambda policies role   # set up IAM
npx remotion lambda sites create    # deploy the site
npx remotion lambda render <site-url> MyVideo  # render
```

## 3D Video (@remotion/three)

Using React Three Fiber to create 3D animated video inside Remotion.

### Good fits

| Use case | Description | Example |
|------|------|------|
| Product showcase | 3D model rotation, exploded-view animation | phone product promo |
| Character animation | cartoon character explainer, storytelling | kids-educational video |
| Data visualization | 3D charts, spatial data | geo data, building/architecture showcase |
| Logo animation | branded 3D logo intro | opening/closing titles |

### Installation

```bash
npm i three @react-three/fiber @remotion/three @types/three
```

**Official template** (recommended for beginners):

```bash
npx create-video@latest --template three
```

### Basic example

```tsx
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

// 3D scene component
const My3DScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const camera = useThree((state) => state.camera);

  // set up the camera
  useEffect(() => {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // rotation animation
  const rotation = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);

  // spring entrance
  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });

  return (
    <mesh rotation={[0, rotation, 0]} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  );
};

// video component
export const My3DVideo = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas width={width} height={height}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <My3DScene />
    </ThreeCanvas>
  );
};
```

### Loading a GLTF model

```tsx
import { useGLTF } from "@react-three/drei";
import { useCurrentFrame, interpolate } from "remotion";

const Model = () => {
  const frame = useCurrentFrame();
  const { scene } = useGLTF("/models/character.glb");

  const rotation = interpolate(frame, [0, 150], [0, Math.PI * 2]);

  return <primitive object={scene} rotation={[0, rotation, 0]} scale={0.5} />;
};
```

**Installing drei** (React Three Fiber's utility library):

```bash
npm i @react-three/drei
```

### Video as a 3D texture

```tsx
import { ThreeCanvas, useVideoTexture } from "@remotion/three";
import { staticFile, useVideoConfig } from "remotion";

const VideoOnMesh = () => {
  const { width, height } = useVideoConfig();
  const videoTexture = useVideoTexture(staticFile("/video.mp4"));

  return (
    <ThreeCanvas width={width} height={height}>
      <mesh>
        <planeGeometry args={[4, 3]} />
        {videoTexture && <meshBasicMaterial map={videoTexture} />}
      </mesh>
    </ThreeCanvas>
  );
};
```

Use `useOffthreadVideoTexture()` during rendering to guarantee frame accuracy:

```tsx
import { useOffthreadVideoTexture } from "@remotion/three";

const texture = useOffthreadVideoTexture({ src: staticFile("/video.mp4") });
```

### 3D Character Assembly Tricks

Build a character out of primitive geometry (no modeling skills required):

```tsx
// A simple cartoon character: head + body + limbs
const CartoonCharacter = ({ emotion = "happy" }) => {
  const frame = useCurrentFrame();

  // expression control
  const eyeScale = emotion === "happy" ? 1 : 0.5;
  const mouthRotation = emotion === "happy" ? 0 : Math.PI;

  // walk cycle: leg swing
  const legSwing = Math.sin(frame * 0.2) * 0.3;

  return (
    <group>
      {/* head - sphere */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FFE4C4" />
      </mesh>

      {/* body - capsule */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 16, 32]} />
        <meshStandardMaterial color="#4169E1" />
      </mesh>

      {/* left leg */}
      <mesh position={[-0.15, -0.3, 0]} rotation={[legSwing, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* right leg */}
      <mesh position={[0.15, -0.3, 0]} rotation={[-legSwing, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
};
```

### ⚠️ Lessons Learned

#### WebGL Context Overflow

**Symptom**: rendering multiple 3D scenes at once throws `Error creating WebGL context`

**Cause**: browsers cap the number of live WebGL contexts (typically 8-16)

**Fix**:

1. **Render config**: use the `angle` OpenGL backend

```ts
// remotion.config.ts
export default {
  chromiumOptions: {
    gl: "angle",  // or "angle-egl"
  },
};
```

For CLI rendering:

```bash
npx remotion render --gl=angle MyVideo out.mp4
```

2. **Lazy-load scenes**: only render 3D content near the current frame

```tsx
import { useCurrentFrame } from "remotion";

const LazyScene = ({ sceneStart, sceneDuration, children }) => {
  const frame = useCurrentFrame();
  const buffer = 30; // 30-frame buffer

  // only render within the scene's time range ± buffer
  const shouldRender =
    frame >= sceneStart - buffer &&
    frame <= sceneStart + sceneDuration + buffer;

  if (!shouldRender) {
    return null; // don't render -- releases the WebGL context
  }

  return <>{children}</>;
};

// usage
<Sequence from={0} durationInFrames={150}>
  <LazyScene sceneStart={0} sceneDuration={150}>
    <Scene1 />
  </LazyScene>
</Sequence>
<Sequence from={150} durationInFrames={150}>
  <LazyScene sceneStart={150} sceneDuration={150}>
    <Scene2 />
  </LazyScene>
</Sequence>
```

#### Server-side render configuration

Server-side rendering (SSR) must also set the `gl` option:

```ts
// renderMedia() / renderFrames() / getCompositions()
await renderMedia({
  composition,
  serveUrl,
  outputLocation: "out.mp4",
  chromiumOptions: {
    gl: "angle",
  },
});
```

#### useCurrentFrame() inside a Sequence

`useCurrentFrame()` inside a `<Sequence>` returns the frame **relative to that Sequence's
start**, not the global frame.

```tsx
<Sequence from={60} durationInFrames={90}>
  <MyScene />  {/* useCurrentFrame() here starts at 0, not 60 */}
</Sequence>
```

**But `useVideoConfig().durationInFrames` does NOT follow suit** — it always returns the
**whole Composition's total duration**, not the current Sequence's. Using it to compute
in-scene progress is a trap:

```tsx
// ❌ durationInFrames is the WHOLE video's frame count (e.g. 2048), not this
// scene's (e.g. 151). Progress may only reach 7% by the time the scene actually ends.
const progress = frame / useVideoConfig().durationInFrames;

// ✅ look up this scene's own duration by id from the generated config
import { SCENES } from "./generated/audioConfig";
const sceneDuration = SCENES.find((s) => s.id === "08-loop")!.durationInFrames;
const progress = Math.min(1, frame / sceneDuration);
```

### Further Resources

| Resource | Purpose | Link |
|------|------|------|
| **Mixamo** | free skeletal animation library | https://www.mixamo.com |
| **Sketchfab** | free/paid 3D models | https://sketchfab.com |
| **Ready Player Me** | avatar generation | https://readyplayer.me |
| **Spline** | online 3D design tool | https://spline.design |
| **gltfjsx** | convert GLTF to a React component | `npx gltfjsx model.glb` |

### Where to go from here

1. **Blender → GLTF**: model in Blender, export as GLTF, load with `useGLTF`
2. **Mixamo animation**: download an FBX animation, convert to GLTF, play it with `useAnimations`
3. **Spline design**: design a 3D scene in Spline, import it with `@splinetool/r3f-spline`

---

## 3Blue1Brown Style Guide (For Tutorial Videos)

For tutorial/explainer videos, borrow 3Blue1Brown's visualization design principles.

### Core Philosophy

```
The 3B1B core idea: let the viewer "discover it themselves" rather than "be told the answer"
```

| Principle | Description | Example |
|------|------|------|
| **Why → What** | ask why before showing what | "How do you recognize a handwritten digit?" → then show the neural network |
| **Build up gradually** | elements appear one by one, not all fading in together | neurons light up in sequence, not simultaneously |
| **Color is semantic** | color conveys information, not decoration | blue = positive, red = negative, yellow = highlight |
| **Make numbers concrete** | show actual numbers to ground abstract ideas | pixel value 0.7, activation 0.92 |
| **2D first** | clarity beats flashiness; reach for 3D only when needed | 2D for network structure, 3D for spatial data |

### Color Palette

```tsx
// 3B1B-style palette (semantic)
const COLORS_3B1B = {
  background: "#000000",     // pure black background
  positive: "#58C4DD",       // blue - positive weight / positive direction
  negative: "#FF6B6B",       // red - negative weight / negative direction
  highlight: "#FFFF00",      // yellow - current focus / highlight
  result: "#83C167",         // green - result / correct
  text: "#FFFFFF",           // white - text
  neutral: "#888888",        // gray - neutral / inactive
  accent: "#FF8C00",         // orange - emphasis
};

// usage example
<meshStandardMaterial
  color={weight > 0 ? COLORS_3B1B.positive : COLORS_3B1B.negative}
  emissive={isHighlighted ? COLORS_3B1B.highlight : "#000"}
  emissiveIntensity={isHighlighted ? 0.3 : 0}
/>
```

### 2D/3D Mixing Strategy

| Content type | Recommended dimension | Reason |
|----------|----------|------|
| Network structure diagram | 2D | clear hierarchy, easy to label |
| Data flow | 2D + animated arrows | emphasizes order and causality |
| Convolution operation | 2D top-down view | grid alignment, values visible |
| Feature map stacking | 2.5D (perspective) | shows depth/channel count |
| 3D object recognition | 3D | the content is inherently 3D |

**2D-mode implementation**: orthographic camera + flat geometry

```tsx
import { OrthographicCamera } from "@react-three/drei";

// orthographic camera = no perspective distortion = reads as 2D
<OrthographicCamera makeDefault position={[0, 0, 10]} zoom={100} />

// flat geometry
<mesh>
  <planeGeometry args={[1, 1]} />  {/* a 2D plane */}
  <meshBasicMaterial color={color} />
</mesh>
```

### Staggered Build-Up Animation

**Core idea**: use a `delay` parameter to make elements appear one after another

```tsx
// a batch of elements, appearing one by one
const StaggeredGroup: React.FC<{
  children: React.ReactNode[];
  delayPerItem?: number
}> = ({ children, delayPerItem = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {React.Children.map(children, (child, i) => {
        const delay = i * delayPerItem;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        if (frame < delay) return null;

        return (
          <group scale={Math.max(0, progress)} opacity={progress}>
            {child}
          </group>
        );
      })}
    </>
  );
};

// usage
<StaggeredGroup delayPerItem={10}>
  <Neuron position={[0, 0, 0]} />
  <Neuron position={[1, 0, 0]} />
  <Neuron position={[2, 0, 0]} />
</StaggeredGroup>
```

### Value Label Component

```tsx
import { Text } from "@react-three/drei";

const ValueLabel: React.FC<{
  value: number;
  position: [number, number, number];
  fontSize?: number;
}> = ({ value, position, fontSize = 0.15 }) => {
  // pick a color based on the value
  const color = value > 0.5 ? COLORS_3B1B.positive :
                value < -0.5 ? COLORS_3B1B.negative :
                COLORS_3B1B.neutral;

  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      font="/fonts/JetBrainsMono-Regular.ttf"  // monospace font
    >
      {value.toFixed(2)}
    </Text>
  );
};
```

### Highlight/Focus Component

```tsx
// a pulsing highlight box -- pulls the eye
const FocusBox: React.FC<{
  position: [number, number, number];
  size: [number, number];
  label?: string;
}> = ({ position, size, label }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame * 0.15) * 0.08;

  return (
    <group position={position}>
      {/* highlight box */}
      <mesh scale={[pulse, pulse, 1]}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={COLORS_3B1B.highlight}
          transparent
          opacity={0.2}
        />
      </mesh>
      {/* border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(...size)]} />
        <lineBasicMaterial color={COLORS_3B1B.highlight} linewidth={2} />
      </lineSegments>
      {/* label */}
      {label && (
        <Text position={[0, size[1] / 2 + 0.2, 0]} fontSize={0.12} color={COLORS_3B1B.highlight}>
          {label}
        </Text>
      )}
    </group>
  );
};
```

### Script-Writing Guide (Tutorial Style)

**❌ Announcement style (avoid)**:
```
"First, the input layer. The image is a matrix of numbers."
"Next, the convolution layer. The kernel slides across the image."
```

**✅ Exploratory style (recommended)**:
```
"You can instantly tell this is the digit 7, but could you describe HOW you did it?
(pause 1s)
That's exactly the problem a neural network has to solve.

Let's first look at what the computer actually 'sees' --
(the pixel grid appears one cell at a time)
not an image, but 784 numbers.

So here's the question: how do you recognize a 7 out of a pile of numbers like that?"
```

**Script structure template**:

```
1. 🎯 Pose the question (10%)
   - open with a question the audience can relate to
   - "Have you ever wondered..."

2. 🤔 Intuitive guess (15%)
   - invite the audience to think about possible approaches
   - "Maybe we could..."

3. 🔍 Build it up step by step (50%)
   - reveal the mechanism one step at a time
   - answer "why was it designed this way" at every step

4. 📐 Formalize it (15%)
   - show the math (optional)
   - turn the intuition into a precise description

5. 🎬 Recap (10%)
   - a quick replay of the whole flow
   - reinforce the core insight
```

### ⚠️ Common Pitfalls

| Pitfall | Problem | Fix |
|------|------|------|
| Gratuitous 3D | rotation/perspective distracts from the point | use the simplest angle that makes the point |
| Arbitrary color | red/green/blue used as pure decoration | establish a color-to-meaning mapping |
| Everything appears at once | the viewer doesn't know where to look | reveal elements one at a time + guide with highlights |
| Only shows "What" | the viewer doesn't understand the motivation | ask "Why" before showing "What" |
| Information overload | too many concepts crammed into one scene | one scene, one concept |

---

## Process Animation Pattern

**Core idea**: don't just show "what it is" — show "how it's computed". Let the viewer watch
data flow and computation happen with their own eyes.

### Good fits

| Use case | Description | Example |
|------|------|------|
| Algorithm visualization | show every operation, step by step | sorting, search, graph traversal |
| Math derivation | expand a calculation term by term | matrix multiplication, convolution |
| Data pipeline | input → transform → output | CNN forward pass, data cleaning |
| Decision process | compare, filter, pick a final answer | max-pooling, softmax |

### Animation Pattern Categories

```
Static display → Structural animation → Process animation
   ↓                    ↓                     ↓
screenshot        elements appear       computation happens
                  fade in/out            data flows
                  camera moves           results get written
```

### Process Animation Component Library

#### 1. Step-by-step calculation display (StepByStep)

```tsx
// reveal a calculation one step at a time
const StepByStepCalc: React.FC<{
  steps: string[];      // ["1×0.5", "+ 0×0.3", "+ 1×(-0.2)", "= 0.3"]
  startFrame: number;
  framesPerStep?: number;
}> = ({ steps, startFrame, framesPerStep = 20 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ fontFamily: "monospace", fontSize: 24, color: "white" }}>
      {steps.map((step, i) => {
        const stepStart = startFrame + i * framesPerStep;
        const opacity = interpolate(frame, [stepStart, stepStart + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isResult = i === steps.length - 1;

        return (
          <span
            key={i}
            style={{
              opacity,
              color: isResult ? COLORS.result : COLORS.text,
              fontWeight: isResult ? "bold" : "normal",
            }}
          >
            {step}{" "}
          </span>
        );
      })}
    </div>
  );
};
```

#### 2. Value fly-in animation (ValueFlyIn)

```tsx
// a computed result flies into its target position
const ValueFlyIn: React.FC<{
  value: number;
  from: [number, number, number];
  to: [number, number, number];
  startFrame: number;
  duration?: number;
}> = ({ value, from, to, startFrame, duration = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  if (frame < startFrame) return null;

  const position: [number, number, number] = [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
    from[2] + (to[2] - from[2]) * progress,
  ];

  const scale = 1.5 - 0.5 * progress; // bigger while flying, shrinks on landing

  return (
    <Text
      position={position}
      fontSize={0.12 * scale}
      color={COLORS.result}
      anchorX="center"
      anchorY="middle"
    >
      {value.toFixed(1)}
    </Text>
  );
};
```

#### 3. Compare-and-highlight (CompareHighlight)

```tsx
// compare a set of values one by one, highlight the winner
const CompareHighlight: React.FC<{
  values: number[];
  positions: [number, number, number][];
  startFrame: number;
  framesPerCompare?: number;
}> = ({ values, positions, startFrame, framesPerCompare = 15 }) => {
  const frame = useCurrentFrame();

  // compute how far through the comparison we are
  const compareIndex = Math.floor((frame - startFrame) / framesPerCompare);
  const maxIndex = values.indexOf(Math.max(...values));

  return (
    <>
      {values.map((value, i) => {
        const isComparing = i <= compareIndex && i <= maxIndex;
        const isWinner = compareIndex >= values.length - 1 && i === maxIndex;

        return (
          <group key={i} position={positions[i]}>
            <mesh>
              <boxGeometry args={[0.2, 0.2, 0.02]} />
              <meshStandardMaterial
                color={isWinner ? COLORS.result : isComparing ? COLORS.highlight : COLORS.dim}
                emissive={isWinner ? COLORS.result : "#000"}
                emissiveIntensity={isWinner ? 0.5 : 0}
              />
            </mesh>
            <Text position={[0, 0, 0.02]} fontSize={0.08} color="#000">
              {value}
            </Text>
          </group>
        );
      })}
    </>
  );
};
```

#### 4. Sliding window (SlidingWindow)

```tsx
// a convolution kernel / pooling window sliding across a grid
const SlidingWindow: React.FC<{
  gridSize: number;         // input grid size
  windowSize: number;       // window size (3 for 3x3)
  stride: number;           // stride
  currentStep: number;      // current step (0, 1, 2, ...)
  onPositionChange?: (row: number, col: number) => void;
}> = ({ gridSize, windowSize, stride, currentStep }) => {
  const outputSize = Math.floor((gridSize - windowSize) / stride) + 1;
  const totalSteps = outputSize * outputSize;
  const step = Math.min(currentStep, totalSteps - 1);

  const row = Math.floor(step / outputSize) * stride;
  const col = (step % outputSize) * stride;

  // window position (relative to the grid's center)
  const pixelSize = 0.12;
  const gap = 0.01;
  const offset = (gridSize / 2 - 0.5) * (pixelSize + gap);
  const windowOffset = (windowSize / 2 - 0.5) * (pixelSize + gap);

  const x = col * (pixelSize + gap) - offset + windowOffset;
  const y = row * (pixelSize + gap) - offset + windowOffset;

  return (
    <mesh position={[x, y, 0.05]}>
      <boxGeometry args={[windowSize * pixelSize + (windowSize - 1) * gap,
                          windowSize * pixelSize + (windowSize - 1) * gap, 0.02]} />
      <meshStandardMaterial
        color={COLORS.negative}
        transparent
        opacity={0.6}
        emissive={COLORS.negative}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};
```

### Script-Writing Guide (Process Animation Version)

**The key shift**: the script needs to match the animation's pacing — leave "breathing room"
for it.

**❌ Traditional script (information-dense)**:
```
"The kernel slides across the image, doing a dot product at each position to get a value."
(one sentence rushes past it, the viewer hasn't even seen what happened yet)
```

**✅ Process-animation script (paced with pauses)**:
```
"Let's see how convolution actually computes something."
(pause -- the window moves into position)

"The kernel covers these 9 pixels."
(pause -- the 3x3 region highlights)

"We multiply each pixel value by its matching weight..."
(pause -- the multiplications appear one by one)

"then add all the results together."
(pause -- the sum is shown)

"This number gets written into the matching spot in the feature map."
(pause -- the result flies in)

"First position, done. Now the window slides one step to the right..."
(speed up through the remaining steps)
```

### Suggested Time Budget

| Level of detail | First full pass | Repeated (sped up) | Best for |
|----------|--------------|----------|----------|
| Very detailed | 3-4s/step | 0.5s/step | a core concept's first appearance |
| Medium | 2s/step | 0.3s/step | supporting concepts |
| Fast | 1s/step | flash by | a repeat of something already explained |

**Example: time budget for a convolution scene**

```
Total: ~25s

0-3s:   intro ("Let's see how convolution actually computes something")
3-12s:  1st convolution (full, detailed)
        - window moves (1s)
        - region highlights (1s)
        - computation (4s)
        - result flies in (2s)
        - narration (1s)
12-18s: 2nd-3rd convolution (medium speed, lighter narration)
18-23s: remaining positions (fast slide, results only)
23-25s: show the complete feature map
```

### ⚠️ Process Animation Lessons Learned

| Problem | Cause | Fix |
|------|------|----------|
| Animation too fast to follow | not enough frames budgeted | add more frames to the key steps |
| Narration desyncs from animation | script had no pauses built in | rewrite the script with explicit pause markers |
| Information overload | too much shown at once | phase it: structure first, then process |
| Repeats feel boring | every repeat shown in full detail | detailed the first time, sped up after |
| Values too small to read | 3D text rendering limitations | use a 2D HTML overlay instead |
| **Persistent camera jitter** | interpolation that never converges | see "Camera Control Pitfall" below |
| **Image rotated 90°** | row/column coordinates got swapped | see "Grid Coordinate Pitfall" below |
| **Progress shows several thousand percent** | the `progress` variable isn't clamped | `Math.min(1, (frame - start) / duration)` |
| **Feature map shows blank color blocks, no values** | the component has no value-display support | add `values` + `showValues` params |

#### Progress variables must be clamped

```tsx
// ❌ Wrong: the scene's actual duration can far exceed what you assumed, and progress can hit 5000%
const calcProgress = frame > 30 ? (frame - 30) / 60 : 0;

// ✅ Right: clamp to [0, 1]
const calcProgress = frame > 30 ? Math.min(1, (frame - 30) / 60) : 0;
```

#### Feature maps should display their computed values

```tsx
// A FeatureMap component should support showing numeric values
<FeatureMap
  position={[2, 0, 0]}
  size={0.6}
  count={1}
  color={COLORS.result}
  filledCells={filledCount}
  gridSize={6}
  values={[2, -1, 0, 3, ...]}  // the computed value in each cell
  showValues                    // turn on value display
/>
```

### 🚨 Common 3D Scene Pitfalls

#### Pitfall 1: Persistent camera jitter

**Symptom**: the frame keeps subtly zooming in and out, jittering

**Wrong**:
```tsx
// ❌ never converges exactly, causes persistent micro-jitter
const CameraController = ({ targetZ }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();

  useEffect(() => {
    camera.position.z += (targetZ - camera.position.z) * 0.05;
  }, [frame]);

  return null;
};
```

**Right**:
```tsx
// ✅ Option A: use spring animation (recommended)
const CameraController = ({ targetZ, transitionFrame = 0 }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const z = spring({
    frame: frame - transitionFrame,
    fps,
    from: camera.position.z,
    to: targetZ,
    config: { damping: 20, stiffness: 100 },
  });

  camera.position.z = z;
  return null;
};

// ✅ Option B: set it directly (no transition)
const CameraController = ({ targetZ }) => {
  const { camera } = useThree();
  camera.position.set(0, 0, targetZ);
  camera.lookAt(0, 0, 0);
  return null;
};

// ✅ Option C: interpolate but snap once close enough
useEffect(() => {
  const delta = targetZ - camera.position.z;
  if (Math.abs(delta) < 0.001) {
    camera.position.z = targetZ; // snap once close
  } else {
    camera.position.z += delta * 0.1;
  }
}, [frame]);
```

#### Pitfall 2: A grid/image rotated 90°

**Symptom**: an image that should display right-side up (e.g. the digit 7) appears rotated by 90°

**Root cause**: in image processing, `row` maps to the y-axis (top to bottom) and `col` maps
to the x-axis (left to right) — but the code mapped the row index to x and the column index to y.

**Wrong**:
```tsx
// ❌ row mapped to x, col mapped to y -- rotates the image 90°
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const x = (row - size/2) * cellSize;  // wrong! row should be y
    const y = (col - size/2) * cellSize;  // wrong! col should be x
    // ...
  }
}
```

**Right**:
```tsx
// ✅ col maps to x, row maps to y (and y must be flipped)
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const x = (col - size/2 + 0.5) * cellSize;           // col → x
    const y = ((size - 1 - row) - size/2 + 0.5) * cellSize; // row → y (flipped)
    // ...
  }
}
```

**Rule of thumb**:
- Image coordinates: `image[row][col]` = `image[y][x]` (row is y, column is x)
- 3D coordinates: x points right, y points up
- Flip row: image row=0 is at the top; 3D y=max is at the top

---

## Workflow Best Practices

### Recommended npm scripts

```json
{
  "scripts": {
    "dev": "remotion studio",
    "audio": "python3 scripts/generate_audio.py",
    "captions": "python3 scripts/align_captions.py",
    "preview": "python3 scripts/preview.py",
    "media": "npm run audio && npm run captions",
    "render": "remotion render Main out/video.mp4 --gl=angle",
    "build": "npm run media && npm run preview && npm run render"
  }
}
```

> **⚠️ Don't call it `prepare`**: this is an npm-reserved lifecycle script name, and
> `npm install` runs it automatically. Name it that and every teammate who installs
> dependencies passively triggers a full narration generation — MiniMax costs money,
> VieNeu downloads a model, and it wastes time and invites failures for no reason.
> Use `media` or any other non-reserved name.

### Standard iteration loop

```
edit script.json ──▶ npm run media ──┐
                                      ├──▶ npm run preview ──▶ look ──▶ happy?
edit a scene component ─────────────┘                             │
      ▲                                                            │ no
      └────────────────────────────────────────────────────────────┘
                                                                   │ yes
                                                    npm run render ─┘
```

**Don't skip preview and go straight to render.** A full render takes minutes; sampling
frames takes seconds, and most problems are only visible by looking at an image.

### Real-time progress

Both narration generation and video rendering can take a while — **always run them in the
foreground** so you can see progress:

```bash
# ✅ recommended: foreground, real-time progress
npm run audio
npm run render

# ✅ or wrap it in a shell script
bash scripts/render.sh

# ❌ avoid: backgrounded, no visible progress
npm run render &
```

**Example render.sh**:
```bash
#!/bin/bash
cd "$(dirname "$0")/.."
echo "🎬 Rendering video..."
npx remotion render MyVideo out/video.mp4
if [ $? -eq 0 ]; then
    echo "✅ Render complete!"
    ls -lh out/video.mp4
else
    echo "❌ Render failed"
    exit 1
fi
```

### Resumability Design Principles

Long-running tasks (like batch audio generation) should support resuming:

1. **Check for existing files**: skip work that's already done
2. **Atomic operations**: one file failing shouldn't affect the ones already completed
3. **Preserve progress**: keep whatever finished if the run fails partway through
4. **Idempotent execution**: running it again produces the same result

## Debugging Tips

1. **Studio hot reload**: `npm run dev` for a live preview
2. **Inspect frames**: scrub the timeline in Studio to check frame by frame
3. **Performance**: avoid heavy computation inside components — use `useMemo`
4. **Static files**: put them under `public/` and reference with `staticFile()`

## FAQ

**Q: Rendering is really slow?**
- increase parallelism with `--concurrency`
- test at lower resolution: `--scale=0.5`
- consider distributed rendering with AWS Lambda

**Q: Fonts aren't showing up?**
- use `@remotion/google-fonts` or load a local font
- make sure the font is loaded before rendering starts

**Q: Video assets won't play?**
- check the video codec (H.264 is recommended)
- use `<OffthreadVideo>` instead of `<Video>` for better performance

## References

- Official docs: https://remotion.dev/docs
- Template gallery: https://remotion.dev/templates
- GitHub: https://github.com/remotion-dev/remotion
