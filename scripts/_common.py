#!/usr/bin/env python3
"""
Shared helpers for the remotion-video skill scripts.

Single source of truth is `script.json` at the project root:

    {
      "compositionId": "Main",
      "fps": 30,
      "lang": "vi",
      "voice": { "provider": "auto", "vieneu": {...}, "minimax": {...}, "edge": {...} },
      "scenes": [
        { "id": "01-intro", "title": "Mở đầu", "text": "...", "cues": {"grid": "chín pixel"} }
      ]
    }

Everything else (audio files, audioConfig.ts, captions.ts) is generated from it.
"""

import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SCRIPT_FILE = PROJECT_ROOT / "script.json"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
GENERATED_DIR = PROJECT_ROOT / "src" / "generated"
MANIFEST_FILE = AUDIO_DIR / ".manifest.json"

DEFAULT_FPS = 30


# --------------------------------------------------------------------------- #
# pretty output
# --------------------------------------------------------------------------- #

def info(msg: str) -> None:
    print(msg, flush=True)


def die(msg: str, code: int = 1) -> None:
    print(f"❌ {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


def rule(title: str = "") -> None:
    print(("─" * 8 + f" {title} " if title else "") + "─" * 8, flush=True)


# --------------------------------------------------------------------------- #
# script.json
# --------------------------------------------------------------------------- #

def load_script(path: Optional[Path] = None) -> Dict[str, Any]:
    """Load and validate script.json."""
    path = path or SCRIPT_FILE
    if not path.exists():
        die(
            f"Không tìm thấy {path.name}.\n"
            f"   Tạo từ template: cp templates/script.example.json {path.name}"
        )

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        die(f"{path.name} không phải JSON hợp lệ: {exc}")

    scenes = data.get("scenes")
    if not scenes:
        die(f"{path.name} phải có mảng 'scenes' không rỗng.")

    seen = set()
    for i, scene in enumerate(scenes):
        for field in ("id", "text"):
            if not scene.get(field):
                die(f"scenes[{i}] thiếu trường bắt buộc '{field}'.")
        if scene["id"] in seen:
            die(f"scene id trùng lặp: '{scene['id']}'")
        seen.add(scene["id"])
        scene.setdefault("title", scene["id"])
        scene.setdefault("cues", {})

    data.setdefault("compositionId", "Main")
    data.setdefault("fps", DEFAULT_FPS)
    data.setdefault("lang", "vi")
    data.setdefault("voice", {})
    return data


def text_hash(text: str, *salt: str) -> str:
    """Content hash so editing narration invalidates the cached audio."""
    h = hashlib.sha256()
    h.update(text.strip().encode("utf-8"))
    for s in salt:
        h.update(b"\x00")
        h.update(str(s).encode("utf-8"))
    return h.hexdigest()[:16]


# --------------------------------------------------------------------------- #
# manifest (enables correct resume)
# --------------------------------------------------------------------------- #

def load_manifest() -> Dict[str, Any]:
    if not MANIFEST_FILE.exists():
        return {}
    try:
        return json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_manifest(manifest: Dict[str, Any]) -> None:
    MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_FILE.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# --------------------------------------------------------------------------- #
# audio helpers
# --------------------------------------------------------------------------- #

def require_binary(name: str, hint: str) -> None:
    from shutil import which

    if which(name) is None:
        die(f"Thiếu '{name}'. {hint}")


def get_audio_duration(file_path: Path) -> float:
    """Duration in seconds via ffprobe. Returns 0.0 if unreadable."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ],
        capture_output=True,
        text=True,
    )
    out = result.stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def to_mp3(src: Path, dst: Path, bitrate: str = "128k") -> None:
    """Transcode (e.g. VieNeu wav) to mp3 so public/ stays small."""
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
         "-codec:a", "libmp3lame", "-b:a", bitrate, str(dst)],
        check=True,
    )


def seconds_to_frames(seconds: float, fps: int) -> int:
    return max(1, round(seconds * fps))


# --------------------------------------------------------------------------- #
# text normalisation (for aligning whisper output to the source script)
# --------------------------------------------------------------------------- #

_PUNCT = re.compile(r"[^\w\s]", re.UNICODE)


def tokenize(text: str) -> List[str]:
    """Split narration into display tokens, keeping original spelling."""
    return [t for t in re.split(r"\s+", text.strip()) if t]


def normalize_token(token: str) -> str:
    """Loose key for matching: lowercase, no punctuation, NFC-normalised."""
    token = unicodedata.normalize("NFC", token).lower()
    return _PUNCT.sub("", token)


# --------------------------------------------------------------------------- #
# TypeScript emission
# --------------------------------------------------------------------------- #

def ts_string(value: str) -> str:
    """Safely embed an arbitrary string in generated TypeScript."""
    return json.dumps(value, ensure_ascii=False)


def write_generated(filename: str, content: str) -> Path:
    """Write a file into src/generated/, creating the directory."""
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    path = GENERATED_DIR / filename
    path.write_text(content, encoding="utf-8")
    return path
