#!/usr/bin/env python3
"""
Unified TTS generation for Remotion videos.

Reads narration from `script.json`, generates one audio file per scene, and
emits `src/generated/audioConfig.ts` for Remotion to consume.

Providers
---------
  vieneu   Local, free, Vietnamese + English, instant voice cloning (Apache 2.0)
           https://github.com/pnnbao97/VieNeu-TTS   ->  pip install vieneu
  minimax  Cloud, paid, voice cloning, many languages
           env: MINIMAX_API_KEY, MINIMAX_VOICE_ID
  edge     Cloud, free, fixed preset voices
           pip install edge-tts

Usage
-----
    python scripts/generate_audio.py                 # resume, auto-pick provider
    python scripts/generate_audio.py --provider vieneu
    python scripts/generate_audio.py --only 03-demo  # regenerate one scene
    python scripts/generate_audio.py --force         # regenerate everything
    python scripts/generate_audio.py --dry-run       # plan + cost estimate only

Resume is content-aware: a scene is regenerated when its text, voice or
provider changes -- not merely when the mp3 is missing.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import (  # noqa: E402
    AUDIO_DIR,
    PROJECT_ROOT,
    SCRIPT_FILE,
    die,
    get_audio_duration,
    info,
    load_manifest,
    load_script,
    require_binary,
    rule,
    save_manifest,
    seconds_to_frames,
    text_hash,
    to_mp3,
    ts_string,
    write_generated,
)

MINIMAX_ENDPOINTS = {
    "global": "https://api.minimax.io/v1/t2a_v2",
    "cn": "https://api.minimaxi.com/v1/t2a_v2",
}

# Rough MiniMax pricing, CNY per 1000 characters (2025).
MINIMAX_PRICE = {"speech-02-hd": 0.10, "speech-02-turbo": 0.05}


def json_compact(obj: Any) -> str:
    """Stable compact rendering, so config dicts can go into a cache key."""
    import json

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


# --------------------------------------------------------------------------- #
# providers
# --------------------------------------------------------------------------- #

class Provider:
    """Base class: synthesise one scene to `out_stem`.mp3."""

    name = "base"

    def __init__(self, config: Dict[str, Any], script: Dict[str, Any]):
        self.config = config
        self.script = script

    # `resolve_voice` and `signature` are classmethods on purpose: the cache
    # check must be able to detect a voice change WITHOUT constructing the
    # provider, because constructing VieNeu loads a multi-hundred-MB model.
    @classmethod
    def resolve_voice(cls, config: Dict[str, Any], script: Dict[str, Any],
                      scene: Dict[str, Any]) -> str:
        return scene.get("voice") or config.get("voice", "")

    @classmethod
    def signature(cls, config: Dict[str, Any], script: Dict[str, Any],
                  scene: Dict[str, Any]) -> str:
        """Anything that changes how the audio sounds must change this string."""
        return f"{cls.name}:{cls.resolve_voice(config, script, scene)}"

    def voice_for(self, scene: Dict[str, Any]) -> str:
        return self.resolve_voice(self.config, self.script, scene)

    def synthesize(self, scene: Dict[str, Any], out_stem: Path) -> Path:
        raise NotImplementedError

    def close(self) -> None:
        """Release engine resources. No-op for cloud providers."""


class VieNeuProvider(Provider):
    """
    Local Vietnamese/English TTS with instant voice cloning.

    API surface (verified against the repo, not the README):
        Vieneu(mode="v3turbo", **engine_kwargs) -> engine
        engine.infer(text, voice=str|dict, ref_audio=path, denoise=bool, ...) -> np.ndarray
        engine.save(audio, path)
        engine.add_voice(name, ref_audio, *, denoise=True, ...)
        engine.list_preset_voices() -> [(label, voice_id), ...]
        engine.close()

    Note: `mode` decides which preset voice set exists -- "v3turbo" (default,
    48 kHz, 20 voices, ids carry Vietnamese diacritics, default "Adam") vs
    "standard" (24 kHz, 6 voices, ascii ids, default "Binh"). Run
    `generate_audio.py --list-voices` to print the real ids for your install.
    """

    name = "vieneu"
    DEFAULT_MODE = "v3turbo"

    # Engine constructor kwargs we forward verbatim when present in config.
    ENGINE_KEYS = ("backbone_repo", "device", "dtype", "backend", "precision",
                   "threads", "max_batch_size", "onnx_repo", "model_subfolder")

    def __init__(self, config, script):
        super().__init__(config, script)
        self.engine = self._build_engine(config)

        # Register the cloned voice once and reuse it for every scene, rather
        # than re-encoding the reference clip on each call.
        ref = config.get("ref_audio")
        if ref:
            ref_path = (PROJECT_ROOT / ref).resolve()
            if not ref_path.exists():
                die(f"Không tìm thấy ref_audio: {ref_path}")
            name = config.get("clone_name", "custom")
            self.engine.add_voice(name, str(ref_path),
                                  denoise=bool(config.get("denoise", True)))
            info(f"🎭 Đã clone giọng từ {ref} → '{name}'")

    @staticmethod
    def _build_engine(config: Dict[str, Any]):
        try:
            from vieneu import Vieneu
        except ImportError:
            die(
                "Chưa cài VieNeu-TTS.\n"
                "   pip install vieneu          # CPU / Apple Silicon (torch-free)\n"
                "   (GPU: cài PyTorch CUDA>=12.8 trước, rồi pip install vieneu)\n"
                "   Repo: https://github.com/pnnbao97/VieNeu-TTS"
            )
        kwargs = {k: config[k] for k in VieNeuProvider.ENGINE_KEYS if k in config}
        mode = config.get("mode", VieNeuProvider.DEFAULT_MODE)
        info(f"🔊 Đang nạp VieNeu-TTS (mode={mode}, lần đầu sẽ tải model về)...")
        return Vieneu(mode=mode, **kwargs)

    @classmethod
    def resolve_voice(cls, config, script, scene):
        clone = config.get("clone_name", "custom") if config.get("ref_audio") else None
        # None lets the engine fall back to its own default voice.
        return scene.get("voice") or clone or config.get("voice") or ""

    @classmethod
    def signature(cls, config, script, scene):
        infer_kwargs = config.get("infer", {})
        return (
            f"{cls.name}:{config.get('mode', cls.DEFAULT_MODE)}"
            f":{cls.resolve_voice(config, script, scene)}"
            f":{config.get('ref_audio', '')}"
            f":{int(bool(config.get('denoise', True)))}"
            f":{json_compact(infer_kwargs)}"
        )

    def synthesize(self, scene, out_stem):
        voice = self.voice_for(scene)
        kwargs: Dict[str, Any] = dict(self.config.get("infer", {}))
        kwargs.setdefault("denoise", bool(self.config.get("denoise", True)))
        if voice:
            kwargs["voice"] = voice

        audio = self.engine.infer(scene["text"], **kwargs)

        wav_path = out_stem.with_suffix(".wav")
        self.engine.save(audio, str(wav_path))

        mp3_path = out_stem.with_suffix(".mp3")
        to_mp3(wav_path, mp3_path)
        wav_path.unlink(missing_ok=True)
        return mp3_path

    def close(self):
        closer = getattr(self.engine, "close", None)
        if callable(closer):
            closer()


class MiniMaxProvider(Provider):
    name = "minimax"

    def __init__(self, config, script):
        super().__init__(config, script)
        try:
            import requests  # noqa: F401
        except ImportError:
            die("Thiếu requests: pip install requests")

        self.api_key = os.environ.get("MINIMAX_API_KEY")
        self.voice_id = os.environ.get("MINIMAX_VOICE_ID")
        if not self.api_key or not self.voice_id:
            die("Cần đặt MINIMAX_API_KEY và MINIMAX_VOICE_ID.")

        region = config.get("region", "global")
        if region not in MINIMAX_ENDPOINTS:
            die(f"region phải là 'global' hoặc 'cn', nhận được '{region}'.")
        # NOTE: api.minimax.chat is NOT a valid host -- it returns "invalid api key".
        self.url = MINIMAX_ENDPOINTS[region]
        self.model = config.get("model", "speech-02-hd")

    @classmethod
    def resolve_voice(cls, config, script, scene):
        return scene.get("voice") or os.environ.get("MINIMAX_VOICE_ID", "")

    @classmethod
    def signature(cls, config, script, scene):
        return (f"{cls.name}:{config.get('model', 'speech-02-hd')}"
                f":{cls.resolve_voice(config, script, scene)}"
                f":{config.get('speed', 1.0)}:{config.get('pitch', 0)}")

    def synthesize(self, scene, out_stem):
        import requests

        payload = {
            "model": self.model,
            "text": scene["text"],
            "stream": False,
            "voice_setting": {
                "voice_id": self.voice_for(scene),
                "speed": self.config.get("speed", 1.0),
                "vol": self.config.get("vol", 1.0),
                "pitch": self.config.get("pitch", 0),
            },
            "audio_setting": {
                "sample_rate": 32000, "bitrate": 128000,
                "format": "mp3", "channel": 1,
            },
        }
        resp = requests.post(
            self.url,
            headers={"Authorization": f"Bearer {self.api_key}",
                     "Content-Type": "application/json"},
            json=payload,
            timeout=120,
        )
        result = resp.json()
        if "data" not in result or "audio" not in result.get("data", {}):
            msg = result.get("base_resp", {}).get("status_msg", str(result)[:200])
            raise RuntimeError(f"MiniMax API lỗi: {msg}")

        mp3_path = out_stem.with_suffix(".mp3")
        mp3_path.write_bytes(bytes.fromhex(result["data"]["audio"]))
        return mp3_path


class EdgeProvider(Provider):
    name = "edge"

    # A few good presets. Vietnamese first -- the original skill had none.
    PRESETS = {
        "vi": "vi-VN-NamMinhNeural",
        "zh": "zh-CN-YunyangNeural",
        "en": "en-US-AndrewNeural",
    }

    def __init__(self, config, script):
        super().__init__(config, script)
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            die("Chưa cài edge-tts: pip install edge-tts")

    @classmethod
    def resolve_voice(cls, config, script, scene):
        lang = script.get("lang", "vi")
        return (scene.get("voice") or config.get("voice")
                or cls.PRESETS.get(lang, cls.PRESETS["en"]))

    @classmethod
    def signature(cls, config, script, scene):
        return (f"{cls.name}:{cls.resolve_voice(config, script, scene)}"
                f":{config.get('rate', '+0%')}")

    def synthesize(self, scene, out_stem):
        import asyncio

        import edge_tts

        mp3_path = out_stem.with_suffix(".mp3")

        async def run():
            communicate = edge_tts.Communicate(
                scene["text"],
                self.voice_for(scene),
                rate=self.config.get("rate", "+0%"),
            )
            await communicate.save(str(mp3_path))

        asyncio.run(run())
        return mp3_path


PROVIDERS = {"vieneu": VieNeuProvider, "minimax": MiniMaxProvider, "edge": EdgeProvider}


def pick_provider(script: Dict[str, Any], requested: Optional[str]) -> str:
    """Resolve 'auto' to the best provider actually available on this machine."""
    voice_cfg = script.get("voice", {})
    requested = requested or voice_cfg.get("provider", "auto")
    if requested != "auto":
        if requested not in PROVIDERS:
            die(f"Provider không hợp lệ: '{requested}'. Chọn: {', '.join(PROVIDERS)} hoặc auto")
        return requested

    from importlib.util import find_spec

    # VieNeu only speaks Vietnamese/English -- don't auto-pick it for other languages.
    order: List[str] = []
    if script.get("lang", "vi") in ("vi", "en"):
        order.append("vieneu")
    order += ["minimax", "edge"]

    for name in order:
        if name == "vieneu" and find_spec("vieneu"):
            return name
        if name == "minimax" and os.environ.get("MINIMAX_API_KEY") and os.environ.get("MINIMAX_VOICE_ID"):
            return name
        if name == "edge" and find_spec("edge_tts"):
            return name

    die(
        "Không có provider TTS nào khả dụng. Cài một trong số:\n"
        "   pip install vieneu      # local, miễn phí, tiếng Việt (khuyến nghị)\n"
        "   pip install edge-tts    # cloud, miễn phí\n"
        "   export MINIMAX_API_KEY=... MINIMAX_VOICE_ID=...   # cloud, trả phí"
    )
    return "edge"  # unreachable


# --------------------------------------------------------------------------- #
# audioConfig.ts emission
# --------------------------------------------------------------------------- #

def write_audio_config(entries: List[Dict[str, Any]], fps: int, tail_frames: int) -> Path:
    blocks = []
    for e in entries:
        blocks.append(
            "  {\n"
            f"    id: {ts_string(e['id'])},\n"
            f"    title: {ts_string(e['title'])},\n"
            f"    durationInFrames: {e['frames']},\n"
            f"    audioFile: {ts_string(e['file'])},\n"
            f"    durationInSeconds: {e['duration']:.3f},\n"
            "  }"
        )
    scenes_block = ",\n".join(blocks)

    content = f"""// AUTO-GENERATED by scripts/generate_audio.py -- do not edit by hand.
// Source of truth: script.json

export interface SceneConfig {{
  id: string;
  title: string;
  durationInFrames: number;
  audioFile: string;
  durationInSeconds: number;
}}

export const FPS = {fps};

export const SCENES: SceneConfig[] = [
{scenes_block},
];

/** Absolute frame at which a scene begins. */
export function getSceneStart(sceneIndex: number): number {{
  return SCENES.slice(0, sceneIndex).reduce((sum, s) => sum + s.durationInFrames, 0);
}}

/** Index of the scene containing an absolute frame. */
export function getSceneIndexAtFrame(frame: number): number {{
  let acc = 0;
  for (let i = 0; i < SCENES.length; i++) {{
    acc += SCENES[i].durationInFrames;
    if (frame < acc) return i;
  }}
  return SCENES.length - 1;
}}

/** Trailing padding so the last scene does not cut off abruptly. */
export const TAIL_FRAMES = {tail_frames};

export const TOTAL_FRAMES =
  SCENES.reduce((sum, s) => sum + s.durationInFrames, 0) + TAIL_FRAMES;
"""
    return write_generated("audioConfig.ts", content)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def list_vieneu_voices() -> None:
    """Print the preset voices the installed engine actually has."""
    script = load_script() if SCRIPT_FILE.exists() else {"voice": {}}
    config = script.get("voice", {}).get("vieneu", {})
    engine = VieNeuProvider._build_engine(config)
    try:
        voices = engine.list_preset_voices()
    except Exception as exc:  # noqa: BLE001
        die(f"Không lấy được danh sách giọng: {exc}")

    rule(f"VieNeu — {len(voices)} giọng (mode={config.get('mode', VieNeuProvider.DEFAULT_MODE)})")
    for label, voice_id in voices:
        info(f"  {voice_id!r:<24} {label}")
    rule()
    info('Dùng trong script.json:  "voice": { "vieneu": { "voice": "<id>" } }')
    closer = getattr(engine, "close", None)
    if callable(closer):
        closer()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate TTS narration for a Remotion video.")
    parser.add_argument("--provider", choices=list(PROVIDERS) + ["auto"], default=None)
    parser.add_argument("--only", action="append", metavar="SCENE_ID",
                        help="Chỉ xử lý scene này (lặp lại được).")
    parser.add_argument("--force", action="store_true", help="Sinh lại toàn bộ, bỏ qua cache.")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ hiện kế hoạch + ước tính chi phí.")
    parser.add_argument("--tail-frames", type=int, default=60,
                        help="Số frame đệm ở cuối video (mặc định 60).")
    parser.add_argument("--list-voices", action="store_true",
                        help="In danh sách giọng có thật của VieNeu rồi thoát.")
    args = parser.parse_args()

    if args.list_voices:
        list_vieneu_voices()
        return

    require_binary("ffprobe", "Cài ffmpeg: brew install ffmpeg")
    require_binary("ffmpeg", "Cài ffmpeg: brew install ffmpeg")

    script = load_script()
    fps = script["fps"]
    scenes = script["scenes"]
    if args.only:
        wanted = set(args.only)
        unknown = wanted - {s["id"] for s in scenes}
        if unknown:
            die(f"Không có scene: {', '.join(sorted(unknown))}")

    provider_name = pick_provider(script, args.provider)
    voice_cfg = script.get("voice", {}).get(provider_name, {})

    total_chars = sum(len(s["text"]) for s in scenes)
    rule("TTS")
    info(f"🎙️  Provider : {provider_name}")
    info(f"🌐 Ngôn ngữ : {script['lang']}    🎞️  FPS: {fps}")
    info(f"📄 Scenes   : {len(scenes)}  ({total_chars:,} ký tự)")
    if provider_name == "minimax":
        model = voice_cfg.get("model", "speech-02-hd")
        price = MINIMAX_PRICE.get(model, 0.1) * total_chars / 1000
        info(f"💰 Ước tính : ~¥{price:.2f} (model {model}, chỉ tính scene cần sinh mới)")
    info(f"📁 Output   : {AUDIO_DIR.relative_to(PROJECT_ROOT)}")
    rule()

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {} if args.force else load_manifest()

    # Decide what actually needs work before loading a heavy model.
    plan = []
    for scene in scenes:
        if args.only and scene["id"] not in args.only:
            plan.append((scene, "skip"))
            continue
        plan.append((scene, "pending"))

    if args.dry_run:
        for scene, _ in plan:
            info(f"  {scene['id']:<20} {len(scene['text']):>5} ký tự  {scene['title']}")
        info("\n(dry-run: chưa sinh gì cả)")
        return

    provider: Optional[Provider] = None
    entries: List[Dict[str, Any]] = []
    generated = skipped = 0

    for index, (scene, state) in enumerate(plan, 1):
        scene_id = scene["id"]
        mp3_path = AUDIO_DIR / f"{scene_id}.mp3"
        prefix = f"[{index}/{len(plan)}] {scene_id:<20}"

        # Provider is constructed lazily -- a fully cached run never loads the model.
        def ensure_provider() -> Provider:
            nonlocal provider
            if provider is None:
                provider = PROVIDERS[provider_name](voice_cfg, script)
            return provider

        # The expected hash is derived from the CURRENT text + CURRENT voice
        # config, never from what the manifest happens to remember -- otherwise
        # a voice change would silently compare against itself and be missed.
        signature = PROVIDERS[provider_name].signature(voice_cfg, script, scene)
        expected_hash = text_hash(scene["text"], provider_name, signature)

        cached = manifest.get(scene_id, {})
        if not args.force and cached and mp3_path.exists():
            if cached.get("hash") == expected_hash and cached.get("duration", 0) > 0:
                entries.append({
                    "id": scene_id, "title": scene["title"],
                    "file": f"{scene_id}.mp3",
                    "duration": cached["duration"],
                    "frames": seconds_to_frames(cached["duration"], fps),
                })
                info(f"{prefix} ⏭️  không đổi ({cached['duration']:.2f}s)")
                skipped += 1
                continue

        if state == "skip" and mp3_path.exists():
            duration = get_audio_duration(mp3_path)
            entries.append({
                "id": scene_id, "title": scene["title"], "file": f"{scene_id}.mp3",
                "duration": duration, "frames": seconds_to_frames(duration, fps),
            })
            info(f"{prefix} ⏭️  ngoài --only")
            skipped += 1
            continue

        print(f"{prefix} ⏳ đang sinh...", end=" ", flush=True)
        try:
            p = ensure_provider()
            out = p.synthesize(scene, AUDIO_DIR / scene_id)
        except Exception as exc:  # noqa: BLE001 -- report and keep partial progress
            print("❌")
            info(f"    {exc}")
            info("\n⚠️  Dừng lại. Các file đã sinh vẫn được giữ — chạy lại để tiếp tục.")
            save_manifest(manifest)
            sys.exit(1)

        duration = get_audio_duration(out)
        frames = seconds_to_frames(duration, fps)
        manifest[scene_id] = {
            "hash": expected_hash,
            "voice_signature": signature,
            "provider": provider_name,
            "file": out.name,
            "duration": duration,
        }
        entries.append({
            "id": scene_id, "title": scene["title"], "file": out.name,
            "duration": duration, "frames": frames,
        })
        print(f"✅ {duration:.2f}s ({frames} frames)")
        generated += 1

    if provider is not None:
        provider.close()
    save_manifest(manifest)

    stale = set(manifest) - {s["id"] for s in scenes}
    if stale:
        info(f"\n⚠️  Audio thừa (scene đã bị xoá khỏi script.json): {', '.join(sorted(stale))}")

    config_path = write_audio_config(entries, fps, args.tail_frames)
    total_frames = sum(e["frames"] for e in entries) + args.tail_frames

    rule("Xong")
    info(f"✅ {generated} sinh mới, {skipped} dùng lại")
    info(f"📝 {config_path.relative_to(PROJECT_ROOT)}")
    info(f"⏱️  Tổng: {total_frames} frames ≈ {total_frames / fps:.1f}s")
    info("\n👉 Bước tiếp: python scripts/align_captions.py")


if __name__ == "__main__":
    main()
