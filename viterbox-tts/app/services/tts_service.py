import os
import subprocess
import uuid
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

from app.core.config import DEVICE, TMP_DIR, WAVS_DIR
from app.schemas.tts import TTSSegment, TTSRequest
from viterbox import Viterbox

_MODEL = None
_MODEL_LOCK = Lock()


def get_model() -> Viterbox:
    global _MODEL
    if _MODEL is None:
        with _MODEL_LOCK:
            if _MODEL is None:
                _MODEL = Viterbox.from_pretrained(DEVICE)
    return _MODEL


def list_reference_voices() -> list[str]:
    if not WAVS_DIR.exists():
        return []
    return [str(p) for p in sorted(WAVS_DIR.glob("*.wav"))]


def default_reference_voice() -> str | None:
    voices = list_reference_voices()
    return voices[0] if voices else None


def model_loaded() -> bool:
    return _MODEL is not None




def extract_timestamps(audio_path: Path, text: str) -> list[TTSSegment]:
    import soundfile as sf
    import re
    
    try:
        info = sf.info(str(audio_path))
        total_sec = info.duration
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cannot read audio for timestamps: {exc}")

    words = [w for w in text.split(" ") if w.strip()]
    if not words:
        return []

    total_weight = 0
    word_weights = []
    
    for word in words:
        clean_word = re.sub(r'[^\w\s]', '', word)
        char_weight = len(clean_word) if clean_word else 1
        
        pause_weight = 0
        if word.endswith(',') or word.endswith(';'):
            pause_weight = 3
        elif word.endswith('.') or word.endswith('!') or word.endswith('?'):
            pause_weight = 6
            
        weight = char_weight + pause_weight
        word_weights.append((word, weight))
        total_weight += weight

    sec_per_weight = total_sec / total_weight if total_weight > 0 else 0
    
    segments = []
    current_time = 0.0
    for word, weight in word_weights:
        duration = weight * sec_per_weight
        segments.append(TTSSegment(start=current_time, end=current_time + duration, text=word))
        current_time += duration
        
    return segments

def generate_tts_file(payload: TTSRequest) -> tuple[Path, int]:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    output_format = payload.output_format.lower()
    if output_format not in {"mp3", "wav"}:
        raise HTTPException(status_code=400, detail="output_format must be mp3 or wav")

    ref_path = (payload.reference_audio_path or "").strip()
    if ref_path:
        ref_file = Path(ref_path)
        if not ref_file.exists():
            raise HTTPException(status_code=400, detail=f"reference_audio_path not found: {ref_path}")
        ref_audio = str(ref_file)
    else:
        ref_audio = default_reference_voice()

    if not ref_audio:
        raise HTTPException(status_code=400, detail="No reference voice available in wavs/")

    try:
        model = get_model()
        audio_tensor = model.generate(
            text=text,
            language=payload.language,
            audio_prompt=ref_audio,
            exaggeration=payload.exaggeration,
            cfg_weight=payload.cfg_weight,
            temperature=payload.temperature,
            sentence_pause_ms=int(payload.sentence_pause * 1000),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}")

    output_stem = f"tts_{uuid.uuid4().hex}"
    wav_path = TMP_DIR / f"{output_stem}.wav"

    try:
        model.save_audio(audio_tensor, str(wav_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cannot save audio: {exc}")

    output_path = wav_path
    if output_format == "mp3":
        output_path = TMP_DIR / f"{output_stem}.mp3"
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(wav_path), str(output_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Cannot convert wav to mp3: {exc}")
        try:
            os.remove(wav_path)
        except OSError:
            pass

    return output_path, model.sr
