from typing import Optional

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text for speech synthesis")
    language: str = Field(default="vi", description="Language code: vi or en")
    reference_audio_path: Optional[str] = Field(default=None, description="Optional voice reference wav path")
    exaggeration: float = Field(default=0.5, ge=0.0, le=2.0)
    cfg_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    temperature: float = Field(default=0.8, ge=0.1, le=1.0)
    sentence_pause: float = Field(default=0.5, ge=0.0, le=2.0)
    output_format: str = Field(default="mp3", description="mp3 or wav")
    return_json: bool = Field(default=False, description="Return JSON with file_path instead of binary file")


class TTSSegment(BaseModel):
    start: float = Field(..., description="Segment start time in seconds")
    end: float = Field(..., description="Segment end time in seconds")
    text: str = Field(..., description="Recognized text in this segment")


class TTSWithTimestampsResponse(BaseModel):
    status: str
    file_path: str
    format: str
    sample_rate: int
    device: str
    language: str
    segments: list[TTSSegment]
