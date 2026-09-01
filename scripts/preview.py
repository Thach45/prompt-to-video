#!/usr/bin/env python3
"""
Visual preview loop: render sparse still frames so the video can be *looked at*
before committing to a full render.

Most video bugs (rotated grids, jittering camera, text clipped off-screen,
elements appearing all at once) are obvious in a single frame and invisible in
the source code. Rendering a handful of stills at low resolution takes seconds
instead of minutes, and produces images an agent -- or a human -- can inspect
and act on.

Usage
-----
    python scripts/preview.py                       # 3 frames per scene
    python scripts/preview.py --frames-per-scene 5
    python scripts/preview.py --scenes 03-conv      # just one scene
    python scripts/preview.py --at 0,120,450        # explicit absolute frames
    python scripts/preview.py --scale 0.5 --no-sheet

Outputs individual PNGs plus a single contact sheet at out/preview/_sheet.png.
"""

import argparse
import math
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import (  # noqa: E402
    AUDIO_DIR,
    PROJECT_ROOT,
    die,
    get_audio_duration,
    info,
    load_script,
    require_binary,
    rule,
)

PREVIEW_DIR = PROJECT_ROOT / "out" / "preview"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]

CHECKLIST = """
🔍 Xem từng frame và tự soi trước khi render full:

   Bố cục   • Chữ có bị tràn/khuất mép không? Có nằm trong safe zone không?
            • Ở 1080p chữ nhỏ nhất còn đọc được không?
   Hướng    • Lưới/ảnh có bị xoay hay lật không? (row→y, col→x, y phải đảo)
   Nhịp     • Các phần tử xuất hiện lần lượt hay ùa ra cùng lúc?
            • Frame đầu scene có trống trơn không? (spring chưa kịp chạy)
   Camera   • So 2 frame liền nhau: khung hình có rung/zoom vặt không?
   Màu      • Màu có mang nghĩa nhất quán không, hay chỉ để trang trí?
   Nội dung • Mỗi scene có đúng MỘT khái niệm không?
            • Số hiển thị có hợp lý không? (progress > 100% là lỗi thiếu clamp)
"""


def find_font() -> Optional[str]:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return path
    return None


def scene_bounds(script) -> List[Tuple[str, int, int]]:
    """[(scene_id, start_frame, duration_frames)] measured from the real audio."""
    fps = script["fps"]
    bounds, cursor = [], 0
    for scene in script["scenes"]:
        audio = AUDIO_DIR / f"{scene['id']}.mp3"
        if not audio.exists():
            die(
                f"Thiếu audio cho scene '{scene['id']}'.\n"
                "   Chạy scripts/generate_audio.py trước, hoặc dùng --at để chỉ định frame thủ công."
            )
        frames = max(1, round(get_audio_duration(audio) * fps))
        bounds.append((scene["id"], cursor, frames))
        cursor += frames
    return bounds


def pick_frames(bounds, per_scene: int, wanted: Optional[set]) -> List[Tuple[str, int]]:
    """Sample each scene at evenly spread positions, avoiding the exact edges."""
    picks = []
    for scene_id, start, duration in bounds:
        if wanted and scene_id not in wanted:
            continue
        for i in range(per_scene):
            # e.g. 3 frames -> 12%, 50%, 88% through the scene
            ratio = (i + 0.5) / per_scene
            offset = min(duration - 1, int(duration * ratio))
            picks.append((scene_id, start + offset))
    return picks


def render_still(comp: str, frame: int, out_path: Path, scale: float, gl: str,
                 props: Optional[str]) -> Tuple[int, bool, str]:
    cmd = [
        "npx", "remotion", "still", comp, str(out_path),
        f"--frame={frame}", f"--scale={scale}",
    ]
    if gl != "default":
        cmd.append(f"--gl={gl}")
    if props:
        cmd.append(f"--props={props}")

    result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        tail = (result.stderr or result.stdout).strip().splitlines()
        return frame, False, "\n".join(tail[-6:])
    return frame, True, ""


def ffmpeg_has_drawtext() -> bool:
    """Many ffmpeg builds ship without libfreetype, so drawtext may not exist."""
    result = subprocess.run(["ffmpeg", "-hide_banner", "-filters"],
                            capture_output=True, text=True)
    return " drawtext " in result.stdout


def label_image(src: Path, text: str, font: Optional[str]) -> bool:
    """
    Burn a caption strip onto a still so a contact sheet stays readable.

    Tries ffmpeg's drawtext, then Pillow. Returns False if neither is usable —
    the caller reports that once rather than silently producing bare images.
    """
    safe = re.sub(r"[^\w \-.]", "", text)

    if font and ffmpeg_has_drawtext():
        tmp = src.with_name(src.stem + "_lbl.png")
        vf = (
            f"drawbox=x=0:y=0:w=iw:h=44:color=black@0.65:t=fill,"
            f"drawtext=fontfile='{font}':text='{safe}':fontcolor=white:"
            f"fontsize=28:x=12:y=8"
        )
        result = subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", vf, str(tmp)],
            capture_output=True, text=True,
        )
        if result.returncode == 0 and tmp.exists():
            tmp.replace(src)
            return True
        tmp.unlink(missing_ok=True)

    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return False

    try:
        img = Image.open(src).convert("RGB")
        draw = ImageDraw.Draw(img, "RGBA")
        draw.rectangle([(0, 0), (img.width, 44)], fill=(0, 0, 0, 165))
        try:
            pil_font = ImageFont.truetype(font, 28) if font else ImageFont.load_default()
        except OSError:
            pil_font = ImageFont.load_default()
        draw.text((12, 8), safe, fill=(255, 255, 255), font=pil_font)
        img.save(src)
        return True
    except Exception:  # noqa: BLE001 -- labelling is cosmetic, never fatal
        return False


def build_sheet(images: List[Path], out_path: Path) -> bool:
    if not images:
        return False
    cols = min(4, max(1, math.ceil(math.sqrt(len(images)))))
    rows = math.ceil(len(images) / cols)

    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for img in images:
        cmd += ["-i", str(img)]
    cmd += [
        "-filter_complex",
        f"{''.join(f'[{i}:v]' for i in range(len(images)))}"
        f"xstack=inputs={len(images)}:layout={_xstack_layout(cols, rows, len(images))}:fill=black[v]"
        if len(images) > 1 else "[0:v]null[v]",
        "-map", "[v]", str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0 and out_path.exists()


def _xstack_layout(cols: int, rows: int, count: int) -> str:
    """xstack layout string, e.g. '0_0|w0_0|0_h0|w0_h0'."""
    cells = []
    for i in range(count):
        c, r = i % cols, i // cols
        x = "0" if c == 0 else "+".join(f"w{k}" for k in range(c))
        y = "0" if r == 0 else "+".join(f"h{k * cols}" for k in range(r))
        cells.append(f"{x}_{y}")
    return "|".join(cells)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render preview stills of the video.")
    parser.add_argument("--comp", help="Composition id (mặc định lấy từ script.json).")
    parser.add_argument("--frames-per-scene", type=int, default=3)
    parser.add_argument("--scenes", help="Chỉ preview các scene này, phân tách bằng dấu phẩy.")
    parser.add_argument("--at", help="Frame tuyệt đối cụ thể, ví dụ 0,120,450.")
    parser.add_argument("--scale", type=float, default=0.4, help="Tỉ lệ render (mặc định 0.4).")
    parser.add_argument("--gl", default="angle", help="Backend WebGL: angle|swiftshader|default.")
    parser.add_argument("--props", help="JSON props truyền cho composition.")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--no-sheet", action="store_true", help="Không ghép contact sheet.")
    parser.add_argument("--keep", action="store_true", help="Giữ lại preview cũ.")
    args = parser.parse_args()

    require_binary("ffmpeg", "Cài ffmpeg: brew install ffmpeg")
    if not (PROJECT_ROOT / "package.json").exists():
        die("Không thấy package.json — hãy chạy script này từ thư mục gốc của dự án Remotion.")

    script = load_script()
    comp = args.comp or script.get("compositionId", "Main")

    if args.at:
        try:
            frames = [int(x) for x in args.at.split(",") if x.strip()]
        except ValueError:
            die("--at phải là danh sách số nguyên, ví dụ: --at 0,120,450")
        picks = [("manual", f) for f in frames]
    else:
        wanted = {s.strip() for s in args.scenes.split(",")} if args.scenes else None
        bounds = scene_bounds(script)
        if wanted:
            unknown = wanted - {b[0] for b in bounds}
            if unknown:
                die(f"Không có scene: {', '.join(sorted(unknown))}")
        picks = pick_frames(bounds, args.frames_per_scene, wanted)

    if not picks:
        die("Không có frame nào để render.")

    if PREVIEW_DIR.exists() and not args.keep:
        shutil.rmtree(PREVIEW_DIR)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    rule("Preview")
    info(f"🎬 Composition: {comp}    📐 scale {args.scale}    🖥️  gl={args.gl}")
    info(f"🖼️  {len(picks)} frame → {PREVIEW_DIR.relative_to(PROJECT_ROOT)}")
    rule()

    jobs = []
    for i, (scene_id, frame) in enumerate(picks):
        out = PREVIEW_DIR / f"{i:03d}_{scene_id}_f{frame:05d}.png"
        jobs.append((scene_id, frame, out))

    failures = []
    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        futures = {
            pool.submit(render_still, comp, frame, out, args.scale, args.gl, args.props):
                (scene_id, frame, out)
            for scene_id, frame, out in jobs
        }
        done = 0
        for future in futures:
            scene_id, frame, out = futures[future]
            _, ok, err = future.result()
            done += 1
            status = "✅" if ok else "❌"
            info(f"[{done}/{len(jobs)}] {status} {scene_id:<20} frame {frame}")
            if not ok:
                failures.append((frame, err))

    if failures:
        rule("Lỗi render")
        for frame, err in failures[:3]:
            info(f"frame {frame}:\n{err}\n")
        if len(failures) > 3:
            info(f"... và {len(failures) - 3} lỗi nữa")

    rendered = sorted(p for _, _, p in jobs if p.exists())
    if not rendered:
        die("Không render được frame nào.")

    font = find_font()
    labelled = 0
    for scene_id, frame, out in jobs:
        if out.exists() and label_image(out, f"{scene_id}  f{frame}", font):
            labelled += 1

    rule("Xong")
    info(f"✅ {len(rendered)}/{len(jobs)} frame")
    if labelled == 0:
        info("ℹ️  Không dán được nhãn lên ảnh (ffmpeg thiếu drawtext và không có Pillow).")
        info("   Tên file vẫn ghi rõ scene + frame. Muốn có nhãn: pip install pillow")

    if not args.no_sheet:
        sheet = PREVIEW_DIR / "_sheet.png"
        if build_sheet(rendered, sheet):
            info(f"🗂️  Contact sheet: {sheet.relative_to(PROJECT_ROOT)}")
        else:
            info("ℹ️  Không ghép được contact sheet — xem từng file PNG.")

    for p in rendered:
        info(f"   {p.relative_to(PROJECT_ROOT)}")

    info(CHECKLIST)


if __name__ == "__main__":
    main()
