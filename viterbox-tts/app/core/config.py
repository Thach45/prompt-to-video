from pathlib import Path
import tempfile

import torch

BASE_DIR = Path(__file__).resolve().parents[2]
WAVS_DIR = BASE_DIR / "wavs"
TMP_DIR = Path(tempfile.gettempdir()) / "viterbox_tts_api"
TMP_DIR.mkdir(parents=True, exist_ok=True)


def resolve_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = resolve_device()
