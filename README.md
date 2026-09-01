# remotion-video

[中文文档](README_CN.md)

A Claude Code Skill for creating programmatic videos with Remotion — narrated by
AI, subtitled automatically, and visually checked before every render.

## Features

- Create videos programmatically with React components
- **Three TTS providers**, auto-selected by what's installed:
  - [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) — local, free, Vietnamese + English, instant voice cloning
  - MiniMax — cloud, paid, voice cloning, many languages
  - Edge TTS — cloud, free, preset voices
- **Frame-accurate captions** via Whisper forced alignment — timings from Whisper,
  spelling from your script, so subtitles are never misspelled
- **Speech cues** — anchor animations to the moment a phrase is spoken instead of
  a hardcoded frame number, so re-recording narration re-times the animation
- **Preview loop** — render sparse stills in seconds and actually look at them
  before committing to a multi-minute full render
- Scene-based architecture where audio length drives timing

## Installation

Copy this folder into your Claude Code skills directory:

```bash
git clone https://github.com/wshuyi/remotion-video-skill.git
cp -r remotion-video-skill ~/.claude/skills/remotion-video
```

Then restart Claude Code or start a new session.

### Dependencies

```bash
brew install ffmpeg              # macOS   (Ubuntu: sudo apt install ffmpeg)
pip install faster-whisper       # captions + cues
pip install pillow               # optional: labels on preview contact sheets
```

Then pick at least one TTS provider:

```bash
pip install vieneu               # local, free, Vietnamese/English (recommended)
pip install edge-tts             # cloud, free, preset voices
# or, for MiniMax:
export MINIMAX_API_KEY="..." MINIMAX_VOICE_ID="..."
```

`"provider": "auto"` in `script.json` picks the best one available on the machine.

`templates/script.example.json` ships with a default voice already cloned —
`templates/voices/nhat-phong.wav` (male, narrative style) — so a fresh project
speaks out of the box. Swap in your own reference clip or a preset voice by
editing the `vieneu` block (see the comments in that file).

## Usage

Trigger the skill by saying:

- "làm video bằng code" / "video giải thích" / "lồng tiếng AI"
- "用代码做视频" / "编程视频" / "自动字幕"
- "Remotion" / "/remotion-video"

### Example prompts

**Tutorial video:**
> Làm giúp mình video giải thích decorator trong Python, khoảng 5 phút

**Data visualization:**
> 用 Remotion 做一个展示 2024 年销售数据的动画视频

**Music visualization:**
> Make a music visualization video synced to this track's rhythm

## Pipeline

`script.json` is the single source of truth. Everything else is generated.

```
script.json  ──generate_audio.py──▶  public/audio/*.mp3
                                     src/generated/audioConfig.ts
             ──align_captions.py──▶  src/generated/captions.ts    (captions + cues)
             ──preview.py─────────▶  out/preview/*.png            (look before you render)
```

```bash
python scripts/generate_audio.py     # incremental: only re-synthesizes changed text
python scripts/align_captions.py     # captions + speech cues
python scripts/preview.py            # stills to inspect — do not skip
npx remotion render Main out/video.mp4
```

## Project structure

```
my-video-project/
├── script.json             # narration, voices, cues — the only file you edit by hand
├── src/
│   ├── Root.tsx
│   ├── generated/          # AUTO-GENERATED, do not edit
│   │   ├── audioConfig.ts  #   scene timings
│   │   └── captions.ts     #   word-level captions + cue frames
│   ├── useCue.ts           # hooks: useCue, useCueProgress, useAfterCue …
│   ├── Captions.tsx        # <CaptionsTrack /> subtitle component
│   └── scenes/
├── public/audio/           # generated narration
├── out/preview/            # preview stills
└── scripts/
    ├── generate_audio.py
    ├── align_captions.py
    └── preview.py
```

## Requirements

- Node.js 18+
- Python 3.9+
- ffmpeg / ffprobe

## License

MIT
