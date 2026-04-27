from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates

from app.core.config import DEVICE
from app.schemas.tts import TTSRequest, TTSWithTimestampsResponse
from app.services.tts_service import (
    default_reference_voice,
    extract_timestamps,
    generate_tts_file,
    list_reference_voices,
    model_loaded,
)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/health")
def health_check():
    return {"status": "ok", "device": DEVICE, "model_loaded": model_loaded()}


@router.get("/voices")
def list_voices():
    voices = list_reference_voices()
    return {"voices": voices, "default_voice": default_reference_voice()}


@router.get("/")
def gui_page(request: Request):
    return templates.TemplateResponse(request, "index.html")


@router.get("/tts-studio")
def tts_studio_page(request: Request):
    voices = list_reference_voices()
    return templates.TemplateResponse(request, "tts_studio.html", {"voices": voices})


@router.post("/tts")
def synthesize_tts(payload: TTSRequest):
    output_path, sample_rate = generate_tts_file(payload)

    if payload.return_json:
        return {
            "status": "ok",
            "file_path": str(output_path),
            "format": payload.output_format.lower(),
            "sample_rate": sample_rate,
            "device": DEVICE,
        }

    media_type = "audio/mpeg" if payload.output_format.lower() == "mp3" else "audio/wav"
    return FileResponse(path=str(output_path), media_type=media_type, filename=output_path.name)


@router.post("/tts-with-timestamps")
def synthesize_tts_with_timestamps(payload: TTSRequest):
    output_path, sample_rate = generate_tts_file(payload)
    segments = extract_timestamps(output_path, payload.text)

    # Đọc file và chuyển sang Base64
    import base64
    audio_content = output_path.read_bytes()
    audio_base64 = base64.b64encode(audio_content).decode("utf-8")

    # Chuẩn hóa segments sang định dạng subtitles (ticks) giống Edge TTS
    # 1 second = 10,000,000 ticks
    subtitles = []
    for seg in segments:
        offset = int(seg.start * 10000000)
        duration = int((seg.end - seg.start) * 10000000)
        subtitles.append({
            "offset": offset,
            "duration": duration,
            "text": seg.text
        })

    # Xóa file tạm sau khi đã chuyển sang base64
    try:
        import os
        os.remove(output_path)
    except:
        pass

    return {
        "audioBase64": audio_base64,
        "subtitles": subtitles,
    }


