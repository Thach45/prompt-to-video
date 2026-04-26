# Prompt to Video Studio

Biến một câu prompt thành video dọc 9:16 có cấu trúc scene, preview realtime và chỉnh spec trực tiếp.

> Mục tiêu của dự án: giúp team content/marketing/dev tạo short-form video nhanh như viết prompt, nhưng vẫn kiểm soát được chất lượng đầu ra ở mức kỹ thuật.

---

## Dự án này làm gì?

`Prompt to Video Studio` là một web app gồm:

- **AI Generation Layer**: Gemini tạo `VideoSpec` theo prompt.
- **Validation Layer**: clamp/normalize dữ liệu để chống vỡ preview.
- **Rendering Layer**: Remotion Player dựng preview video theo template.
- **Editing Layer**: chỉnh JSON trực tiếp và apply ngay để iterate cực nhanh.

Nói ngắn gọn: đây là một **AI video prototyping engine** cho nội dung dọc.

---

## Điểm mạnh nổi bật

- **Prompt -> Scene-based spec**: AI trả dữ liệu theo từng scene thay vì text rời.
- **Template control**: chọn `technical`, `share-news`, hoặc `auto`.
- **Streaming API**: nhận trạng thái realtime khi AI đang sinh dữ liệu.
- **Editable JSON**: sửa spec thủ công rồi bấm Apply để xem ngay kết quả.
- **Data hardening**: ràng buộc màu, media type, thời lượng, fps, ratio để tránh crash.
- **Studio workflow**: chat + code + preview trong cùng một màn hình.

---

## Demo flow (1 phút hiểu toàn hệ thống)

1. Vào `/studio`
2. Nhập prompt (ví dụ video 60s, tông màu, chủ đề)
3. Chọn template (hoặc để auto)
4. Bấm generate -> API stream trạng thái
5. Nhận `VideoSpec` -> preview bằng Remotion
6. Chỉnh JSON ở tab Code -> Apply -> preview cập nhật ngay

---

## Kiến trúc tổng quan

### Frontend

- `Next.js` App Router
- Studio UI: chat panel + preview panel + JSON editor
- Route landing riêng để giới thiệu sản phẩm

### Backend/API

- `POST /api/generate-video`
- Gọi Gemini (`@google/genai`) với schema JSON
- Trả về stream theo sự kiện (`progress`, `done`, `error`)

### Video engine

- `@remotion/player` để preview trong web
- Template-based rendering (`technical`, `share-news`)
- Dữ liệu đầu vào chuẩn hóa bởi `clampVideoSpec`

---

## Tech stack

- `Next.js` (TypeScript, App Router)
- `Remotion` + `@remotion/player`
- `@google/genai` (Gemini API)
- `Tailwind CSS`
- `lucide-react`

---

## Route map

- `/` - landing page
- `/studio` - prompt editor + live preview + JSON apply
- `/mock` - test template với mock data (không gọi API)
- `/api/generate-video` - endpoint sinh spec từ Gemini

---

## Cài đặt nhanh

### 1) Install

```bash
npm install
```

### 2) Environment

Tạo `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

> Nếu không set `GEMINI_MODEL`, app dùng mặc định `gemini-2.5-flash`.

### 3) Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) -> vào `/studio`.

---

## NPM scripts

- `npm run dev` - chạy development server
- `npm run build` - build production
- `npm run start` - chạy production server
- `npm run lint` - kiểm tra lint

---

## Dữ liệu cốt lõi

### `VideoSpec`

- `templateId`: `technical` | `share-news`
- `title`, `subtitle`, `cta`, `accent`
- `fps`, `width`, `height`, `durationInFrames`
- `scenes[]`: danh sách scene dựng video

### `scenes[]`

Mỗi scene thường gồm:

- `layout`: `intro` | `standard` | `outro`
- `title`, `subtitle`
- `durationSec`
- `accent`
- `media` (`icon` | `image` | `chart` | `list`)

---

## Tiêu chuẩn an toàn dữ liệu (đã áp dụng)

- Clamp fps, duration, dimensions về ngưỡng hợp lệ
- Giới hạn scene count
- Validate media theo type (`icon` enum, `image` URL)
- Fallback an toàn khi AI trả thiếu field
- Ép ratio video theo định dạng mục tiêu để tránh vỡ layout

---

## Dev notes

- Không commit secrets (`.env`, API key thật)
- Sửa template thì test cả `/studio` và `/mock`
- Trước khi merge: chạy `npm run build`

---

## Roadmap gợi ý

- Export render pipeline (final mp4)
- Voiceover/TTS tự động theo scenes
- Template registry mở rộng
- Multi-language prompt packs
- Preset style system (brand kits)
