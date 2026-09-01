#!/usr/bin/env python3
"""
Forced alignment: turn generated narration into frame-accurate captions and cues.

Why not plain transcription?
---------------------------
We already know exactly what was said -- we wrote `script.json`. Whisper is good
at *when* a word was spoken but unreliable at *how it is spelled* (Vietnamese
diacritics, "hai mươi" vs "20", code-switched English). So we take Whisper's
timings and the script's spelling, and align the two sequences.

Result: subtitles that are always correctly spelled, plus named cues that let an
animation fire on the exact frame a phrase is spoken.

Usage
-----
    python scripts/align_captions.py
    python scripts/align_captions.py --model small     # faster, less precise
    python scripts/align_captions.py --force           # ignore the cache

Dependencies
------------
    pip install faster-whisper      # recommended
    # or: pip install openai-whisper
"""

import argparse
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import (  # noqa: E402
    AUDIO_DIR,
    GENERATED_DIR,
    PROJECT_ROOT,
    die,
    get_audio_duration,
    info,
    load_script,
    normalize_token,
    rule,
    tokenize,
    ts_string,
    write_generated,
)

CACHE_FILE = GENERATED_DIR / ".captions-cache.json"
SENTENCE_END = re.compile(r"[.!?…:;]$")


# --------------------------------------------------------------------------- #
# whisper backends
# --------------------------------------------------------------------------- #

def transcribe_words(audio: Path, model_name: str, lang: str) -> List[Tuple[str, float, float]]:
    """Return [(word, start_s, end_s)] using whichever whisper backend is installed."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return _transcribe_openai_whisper(audio, model_name, lang)

    global _FW_MODEL  # noqa: PLW0603 -- load the model once per run
    if _FW_MODEL is None or _FW_MODEL[0] != model_name:
        info(f"🧠 Nạp faster-whisper '{model_name}' (lần đầu sẽ tải về)...")
        _FW_MODEL = (model_name, WhisperModel(model_name, device="cpu", compute_type="int8"))

    segments, _ = _FW_MODEL[1].transcribe(
        str(audio), language=lang, word_timestamps=True, vad_filter=False,
    )
    words: List[Tuple[str, float, float]] = []
    for seg in segments:
        for w in seg.words or []:
            words.append((w.word.strip(), float(w.start), float(w.end)))
    return words


_FW_MODEL: Optional[Tuple[str, Any]] = None
_OW_MODEL: Optional[Tuple[str, Any]] = None


def _transcribe_openai_whisper(audio: Path, model_name: str, lang: str):
    try:
        import whisper
    except ImportError:
        die(
            "Cần một backend Whisper để căn phụ đề:\n"
            "   pip install faster-whisper     # khuyến nghị, nhanh hơn nhiều\n"
            "   pip install openai-whisper     # thay thế"
        )
    global _OW_MODEL  # noqa: PLW0603
    if _OW_MODEL is None or _OW_MODEL[0] != model_name:
        info(f"🧠 Nạp openai-whisper '{model_name}'...")
        _OW_MODEL = (model_name, whisper.load_model(model_name))

    result = _OW_MODEL[1].transcribe(str(audio), language=lang, word_timestamps=True)
    words = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []):
            words.append((w["word"].strip(), float(w["start"]), float(w["end"])))
    return words


# --------------------------------------------------------------------------- #
# alignment
# --------------------------------------------------------------------------- #

def align(
    script_text: str,
    heard: List[Tuple[str, float, float]],
    duration: float,
) -> List[Dict[str, Any]]:
    """
    Map Whisper timings onto the script's own tokens.

    Tokens Whisper missed get timings interpolated from their neighbours, so
    every script word always ends up with a sane start/end.
    """
    display = tokenize(script_text)
    if not display:
        return []

    # Indices of tokens that carry actual matchable content ("--", "..." do not).
    keys: List[str] = []
    key_to_display: List[int] = []
    for i, tok in enumerate(display):
        k = normalize_token(tok)
        if k:
            keys.append(k)
            key_to_display.append(i)

    heard_keys, heard_times = [], []
    for text, start, end in heard:
        k = normalize_token(text)
        if k:
            heard_keys.append(k)
            heard_times.append((start, end))

    times: List[Optional[Tuple[float, float]]] = [None] * len(display)

    if heard_keys and keys:
        matcher = difflib.SequenceMatcher(None, keys, heard_keys, autojunk=False)
        for a, b, size in matcher.get_matching_blocks():
            for offset in range(size):
                times[key_to_display[a + offset]] = heard_times[b + offset]

    # Fill the gaps. Anchors are the tokens we did match.
    anchors = [i for i, t in enumerate(times) if t is not None]
    if not anchors:
        # Whisper gave us nothing usable -- distribute by token length instead.
        weights = [max(1, len(t)) for t in display]
        total = sum(weights)
        cursor = 0.0
        for i, w in enumerate(weights):
            span = duration * w / total
            times[i] = (cursor, cursor + span)
            cursor += span
    else:
        first, last = anchors[0], anchors[-1]
        # Leading tokens: back-fill from the first anchor towards 0.
        if first > 0:
            head_end = times[first][0]
            step = head_end / (first + 1)
            for i in range(first):
                times[i] = (i * step, (i + 1) * step)
        # Trailing tokens: extend from the last anchor to the end of the audio.
        if last < len(display) - 1:
            tail_start = times[last][1]
            remaining = len(display) - 1 - last
            step = max(0.0, duration - tail_start) / max(1, remaining)
            for n, i in enumerate(range(last + 1, len(display))):
                times[i] = (tail_start + n * step, tail_start + (n + 1) * step)
        # Interior gaps: spread evenly between the two surrounding anchors.
        for a, b in zip(anchors, anchors[1:]):
            if b - a <= 1:
                continue
            gap_start, gap_end = times[a][1], times[b][0]
            count = b - a - 1
            step = max(0.0, gap_end - gap_start) / count
            for n, i in enumerate(range(a + 1, b)):
                times[i] = (gap_start + n * step, gap_start + (n + 1) * step)

    out = []
    for tok, span in zip(display, times):
        start, end = span  # type: ignore[misc]
        start = max(0.0, min(start, duration))
        end = max(start, min(end, duration))
        out.append({"text": tok, "start": start, "end": end})
    return out


def chunk_lines(words: List[Dict[str, Any]], max_words: int, max_chars: int) -> List[Dict[str, Any]]:
    """Group words into subtitle lines, breaking on punctuation or length."""
    lines: List[Dict[str, Any]] = []
    current: List[int] = []

    def flush():
        if not current:
            return
        text = " ".join(words[i]["text"] for i in current)
        lines.append({
            "text": text,
            "start": words[current[0]]["start"],
            "end": words[current[-1]]["end"],
            "wordStart": current[0],
            "wordEnd": current[-1],
        })
        current.clear()

    for i, w in enumerate(words):
        current.append(i)
        joined = " ".join(words[j]["text"] for j in current)
        if SENTENCE_END.search(w["text"]) or len(current) >= max_words or len(joined) >= max_chars:
            flush()
    flush()
    return lines


def find_cue(words: List[Dict[str, Any]], phrase: str) -> Optional[int]:
    """Index of the first word of `phrase` within the aligned words."""
    target = [normalize_token(t) for t in tokenize(phrase)]
    target = [t for t in target if t]
    if not target:
        return None
    keys = [normalize_token(w["text"]) for w in words]
    for i in range(len(keys) - len(target) + 1):
        if keys[i:i + len(target)] == target:
            return i
    return None


# --------------------------------------------------------------------------- #
# emission
# --------------------------------------------------------------------------- #

def to_frames(seconds: float, fps: int) -> int:
    return max(0, round(seconds * fps))


def write_captions_ts(scenes: List[Dict[str, Any]], fps: int) -> Path:
    blocks = []
    for s in scenes:
        words = ",\n".join(
            f"      {{ text: {ts_string(w['text'])}, startFrame: {w['startFrame']}, endFrame: {w['endFrame']} }}"
            for w in s["words"]
        )
        lines = ",\n".join(
            f"      {{ text: {ts_string(l['text'])}, startFrame: {l['startFrame']}, "
            f"endFrame: {l['endFrame']}, wordStart: {l['wordStart']}, wordEnd: {l['wordEnd']} }}"
            for l in s["lines"]
        )
        cues = ", ".join(f"{ts_string(k)}: {v}" for k, v in s["cues"].items())
        blocks.append(
            "  {\n"
            f"    id: {ts_string(s['id'])},\n"
            f"    startFrame: {s['startFrame']},\n"
            f"    durationInFrames: {s['durationInFrames']},\n"
            f"    cues: {{ {cues} }},\n"
            f"    words: [\n{words}\n    ],\n"
            f"    lines: [\n{lines}\n    ],\n"
            "  }"
        )

    scenes_block = ",\n".join(blocks)

    content = f"""// AUTO-GENERATED by scripts/align_captions.py -- do not edit by hand.
// Timings come from Whisper; the wording comes from script.json.
// All frame numbers are RELATIVE TO THE SCENE (matching <Sequence> semantics).

export interface CaptionWord {{
  text: string;
  startFrame: number;
  endFrame: number;
}}

export interface CaptionLine {{
  text: string;
  startFrame: number;
  endFrame: number;
  wordStart: number;
  wordEnd: number;
}}

export interface SceneCaptions {{
  id: string;
  /** Absolute frame where this scene starts in the timeline. */
  startFrame: number;
  durationInFrames: number;
  /** Named anchors from script.json -> scene-relative frame. */
  cues: Record<string, number>;
  words: CaptionWord[];
  lines: CaptionLine[];
}}

export const CAPTION_FPS = {fps};

export const CAPTIONS: SceneCaptions[] = [
{scenes_block},
];

export const CAPTIONS_BY_ID: Record<string, SceneCaptions> = Object.fromEntries(
  CAPTIONS.map((c) => [c.id, c]),
);
"""
    return write_generated("captions.ts", content)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def file_fingerprint(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def main() -> None:
    parser = argparse.ArgumentParser(description="Align narration audio to captions and cues.")
    parser.add_argument("--model", default="medium",
                        help="Whisper model: tiny|base|small|medium|large-v3 (mặc định medium).")
    parser.add_argument("--force", action="store_true", help="Bỏ qua cache, căn lại tất cả.")
    parser.add_argument("--max-words", type=int, default=8, help="Số từ tối đa mỗi dòng phụ đề.")
    parser.add_argument("--max-chars", type=int, default=42, help="Số ký tự tối đa mỗi dòng phụ đề.")
    args = parser.parse_args()

    script = load_script()
    fps = script["fps"]
    lang = script.get("lang", "vi")

    cache: Dict[str, Any] = {}
    if CACHE_FILE.exists() and not args.force:
        try:
            cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            cache = {}

    rule("Căn phụ đề")
    info(f"🧠 Model: {args.model}    🌐 Ngôn ngữ: {lang}")
    rule()

    out_scenes: List[Dict[str, Any]] = []
    absolute = 0
    missing_cues: List[str] = []

    for index, scene in enumerate(script["scenes"], 1):
        scene_id = scene["id"]
        audio = AUDIO_DIR / f"{scene_id}.mp3"
        prefix = f"[{index}/{len(script['scenes'])}] {scene_id:<20}"

        if not audio.exists():
            die(f"Thiếu {audio.relative_to(PROJECT_ROOT)} — chạy scripts/generate_audio.py trước.")

        duration = get_audio_duration(audio)
        duration_frames = max(1, round(duration * fps))
        fingerprint = file_fingerprint(audio)
        cache_key = f"{scene_id}:{args.model}"
        cached = cache.get(cache_key)

        if cached and cached.get("fingerprint") == fingerprint:
            words = cached["words"]
            print(f"{prefix} ⏭️  dùng cache ({len(words)} từ)")
        else:
            print(f"{prefix} ⏳ đang căn...", end=" ", flush=True)
            heard = transcribe_words(audio, args.model, lang)
            words = align(scene["text"], heard, duration)
            cache[cache_key] = {"fingerprint": fingerprint, "words": words}
            print(f"✅ {len(words)} từ (nghe được {len(heard)})")

        framed = [
            {
                "text": w["text"],
                "startFrame": to_frames(w["start"], fps),
                "endFrame": max(to_frames(w["end"], fps), to_frames(w["start"], fps) + 1),
            }
            for w in words
        ]
        raw_lines = chunk_lines(words, args.max_words, args.max_chars)
        lines = [
            {
                "text": l["text"],
                "startFrame": to_frames(l["start"], fps),
                "endFrame": to_frames(l["end"], fps),
                "wordStart": l["wordStart"],
                "wordEnd": l["wordEnd"],
            }
            for l in raw_lines
        ]

        cues: Dict[str, int] = {}
        for name, phrase in (scene.get("cues") or {}).items():
            idx = find_cue(words, phrase)
            if idx is None:
                missing_cues.append(f"{scene_id}.{name} → \"{phrase}\"")
            else:
                cues[name] = framed[idx]["startFrame"]

        out_scenes.append({
            "id": scene_id,
            "startFrame": absolute,
            "durationInFrames": duration_frames,
            "cues": cues,
            "words": framed,
            "lines": lines,
        })
        absolute += duration_frames

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    path = write_captions_ts(out_scenes, fps)

    rule("Xong")
    total_words = sum(len(s["words"]) for s in out_scenes)
    total_cues = sum(len(s["cues"]) for s in out_scenes)
    info(f"✅ {total_words} từ, {total_cues} cue trên {len(out_scenes)} scene")
    info(f"📝 {path.relative_to(PROJECT_ROOT)}")
    if missing_cues:
        info("\n⚠️  Không tìm thấy cue (kiểm tra lại chính tả so với 'text' của scene):")
        for m in missing_cues:
            info(f"    {m}")


if __name__ == "__main__":
    main()
