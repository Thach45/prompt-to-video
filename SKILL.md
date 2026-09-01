---
name: remotion-video
description: |
  使用 Remotion 框架以编程方式创建视频。用 React 组件定义画面，配 AI 配音，
  自动生成帧级对齐的字幕，并在渲染前抽帧预览自检。
  触发词：
  - "用代码做视频"、"编程视频"、"React 视频"、"AI 配音视频"、"自动字幕"
  - "làm video bằng code"、"video giải thích"、"lồng tiếng AI"、"phụ đề tự động"
  - "Remotion"、"remotion"、"VieNeu"
  - "/remotion-video"
  适用场景：
  - 程序化视频：(1) 批量生成 (2) 数据驱动（如年度总结）(3) 音乐可视化 (4) 自动字幕
  - 教程讲解视频：(5) 技术概念可视化（如 CNN、算法）(6) 分层递进讲解 (7) AI 配音教程
  - 3D 视频：(8) 产品展示/模型动画 (9) 卡通角色讲解 (10) 3D 数据可视化 (11) Logo 动画
  内置能力：
  - 三种 TTS：VieNeu-TTS（本地/越南语/可克隆音色）、MiniMax（云端/中文）、Edge TTS（免费兜底）
  - Whisper 强制对齐 → 拼写正确的字幕 + 可驱动动画的语音锚点（cue）
  - 抽帧预览循环：渲染前先出图肉眼检查，避免盲写
---

# Remotion Video

用 React 以编程方式创建 MP4 视频的框架。

## 核心概念

1. **Composition** - 视频的定义（尺寸、帧率、时长）
2. **useCurrentFrame()** - 获取当前帧号，驱动动画
3. **interpolate()** - 将帧号映射到任意值（位置、透明度等）
4. **spring()** - 物理动画效果
5. **<Sequence>** - 时间轴上排列组件

## 快速开始

### 创建新项目

```bash
npx create-video@latest
```

选择模板后：

```bash
cd <project-name>
npm run dev  # 启动 Remotion Studio 预览
```

### 项目结构

```
my-video/
├── src/
│   ├── Root.tsx           # 注册所有 Composition
│   ├── HelloWorld.tsx     # 视频组件
│   └── index.ts           # 入口
├── public/                # 静态资源（音频、图片）
├── remotion.config.ts     # 配置文件
└── package.json
```

## 基础组件示例

### 最小视频组件

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ fontSize: 100 }}>Frame {frame}</h1>
    </AbsoluteFill>
  );
};
```

### 注册 Composition

```tsx
// Root.tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}  // 5秒 @ 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

## 动画技巧

### interpolate - 值映射

```tsx
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// 0-30帧：透明度 0→1
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",  // 超出范围时钳制
});

// 位移动画
const translateY = interpolate(frame, [0, 30], [50, 0]);
```

### spring - 物理动画

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame,
  fps,
  config: { damping: 10, stiffness: 100 },
});
```

### Sequence - 时间编排

```tsx
import { Sequence } from "remotion";

<>
  <Sequence from={0} durationInFrames={60}>
    <Intro />
  </Sequence>
  <Sequence from={60} durationInFrames={90}>
    <MainContent />
  </Sequence>
  <Sequence from={150}>
    <Outro />
  </Sequence>
</>
```

## 配音、字幕与预览（核心工作流）

三个脚本，一条流水线。**唯一数据源是项目根目录的 `script.json`**，其余全部自动生成。

```
script.json  ──generate_audio.py──▶  public/audio/*.mp3
                                     src/generated/audioConfig.ts
             ──align_captions.py──▶  src/generated/captions.ts   （字幕 + cue）
             ──preview.py─────────▶  out/preview/*.png           （渲染前肉眼检查）
```

```bash
python scripts/generate_audio.py     # 1. 配音（增量，内容变了才重新生成）
python scripts/align_captions.py     # 2. 字幕对齐 + 语音锚点
python scripts/preview.py            # 3. 抽帧预览 —— 渲染前必做
npx remotion render Main out/video.mp4
```

### script.json

```json
{
  "compositionId": "Main",
  "fps": 30,
  "lang": "vi",
  "voice": { "provider": "auto" },
  "scenes": [
    {
      "id": "03-conv",
      "title": "卷积",
      "text": "这个窗口覆盖了九个像素。我们把每个像素和对应的权重相乘，再全部加起来。",
      "cues": { "window": "这个窗口", "multiply": "相乘", "sum": "加起来" }
    }
  ]
}
```

- `text` —— 解说词，也是字幕文字的来源（拼写永远正确）
- `cues` —— 给动画用的**语音锚点**：`名字 → 台词里的一个短语`
- 每个场景可加 `"voice": "..."` 覆盖音色，用于多角色对话

从模板开始：

```bash
cp templates/script.example.json script.json
cp templates/src/useCue.ts templates/src/Captions.tsx src/
mkdir -p voices && cp templates/voices/nhat-phong.wav voices/
```

模板里的默认配音已经是克隆音色 —— `templates/voices/nhat-phong.wav`
（男声、叙述风格），`script.example.json` 里对应 `ref_audio` + `clone_name`。
不改任何东西直接跑 `generate_audio.py` 就能听到这个声音。
想换回内置预设音色，看 `script.example.json` 里 `_comment_preset` 那段注释。

---

### TTS 方案对比

| 方案 | 语言 | 音色克隆 | 费用 | 硬件 | 推荐度 |
|------|------|----------|------|------|--------|
| **VieNeu-TTS** | 越南语 / 英语 | ✅ 3–8 秒样本即时克隆 | 免费（Apache 2.0） | CPU 即可，Apple Silicon 约 7× 实时 | ⭐⭐⭐ 越南语首选 |
| **MiniMax TTS** | 中文等多语言 | ✅ 云端克隆 | 按字符计费 | 无（云端） | ⭐⭐⭐ 中文首选 |
| **Edge TTS** | 多语言 | ❌ 固定音色 | 免费 | 无（云端） | ⭐⭐ 兜底 |

> 模板默认配的就是 VieNeu 克隆音色（见上），不用额外配置就能出声。

`"provider": "auto"` 会按机器上**实际可用**的情况自动挑选：

```
lang 是 vi / en  →  vieneu → minimax → edge
其他语言          →  minimax → edge          （VieNeu 只支持越/英）
```

也可强制指定：`python scripts/generate_audio.py --provider edge`

#### VieNeu-TTS（本地，越南语）

```bash
pip install vieneu          # CPU / macOS
# GPU：先装 PyTorch(CUDA≥12.8)，再 pip install vieneu
```

**⚠️ 音色 ID 取决于 `mode`**，两套音色完全不同：

| mode | 采样率 | 音色数 | ID 形式 | 默认 |
|------|--------|--------|---------|------|
| `v3turbo`（默认） | 48 kHz | 20 | **带声调符号**，如 `"Phạm Tuyên"` | `Adam` |
| `standard` | 24 kHz | 6 | 无声调，如 `"Tuyen"` | `Binh` |

别照抄文档里的名字，**直接问引擎**：

```bash
python scripts/generate_audio.py --list-voices
```

v3turbo 的 20 个音色按口音分：

- **北部**：Minh Đức、Phạm Tuyên、Thanh Bình、Trúc Ly、Ngọc Linh、Đoan Trang、Mai Anh、Quỳnh Anh、Ngọc Huyền
- **中部**：Quang Sơn、Ngọc Trân
- **南部**：Adam、Thái Sơn、Xuân Vĩnh、Minh Triết、Thục Đoan、Thùy Dung、Mỹ Duyên、Đức Trí、Kim Thanh

其它要点：

- **克隆音色**：`"ref_audio": "voices/me.wav"`（3–8 秒干净人声）+ 可选 `"clone_name"`。
  脚本只在启动时 `add_voice()` 注册一次，不会每个场景重新编码参考音频。
  `mode: "standard"` 的克隆还需要参考音频的文字稿（`infer` 的 `ref_text`）；
  默认的 `v3turbo` 用 ref codes，不需要。
- **默认带水印**：`infer(apply_watermark=True)` 是默认值。要改就写
  `"infer": { "apply_watermark": false }`，并自行确认符合该项目的许可与伦理要求。
- 支持情感标记（实验性）：`[cười]` 笑、`[thở dài]` 叹气、`[hắng giọng]` 清嗓
- 支持越英混说（code-switching），讲技术内容时英文术语不会读错
- 输出 wav（numpy float32），脚本自动转成 mp3 以减小 `public/` 体积
- 引擎参数直接透传：`backend`（auto/onnx/pytorch）、`device`、`precision`（int8/fp32）、
  `threads`；推理参数写在 `"infer": {...}` 里
- 仓库：https://github.com/pnnbao97/VieNeu-TTS

#### MiniMax TTS（云端，中文）

```bash
export MINIMAX_API_KEY="..."
export MINIMAX_VOICE_ID="..."
```

| 版本 | API 域名 |
|------|----------|
| 国际版 | `api.minimax.io`（`"region": "global"`，默认） |
| 国内版 | `api.minimaxi.com`（`"region": "cn"`） |

**⚠️ `api.minimax.chat` 是错误域名**，会返回 "invalid api key"。

价格：`speech-02-hd` ¥0.1/千字符，`speech-02-turbo` ¥0.05/千字符。
先用 `--dry-run` 看一眼预估花费再跑。

#### Edge TTS（云端，免费兜底）

```bash
pip install edge-tts
```

| 语音 ID | 语言 | 风格 |
|---------|------|------|
| vi-VN-NamMinhNeural | 越南语 | 男声（默认） |
| vi-VN-HoaiMyNeural | 越南语 | 女声 |
| zh-CN-YunyangNeural | 中文 | 专业播音腔 |
| zh-CN-XiaoxiaoNeural | 中文 | 温暖自然 |
| en-US-AndrewNeural | 英语 | 自然男声 |

---

### 增量生成（断点续作）

`generate_audio.py` 用 `public/audio/.manifest.json` 记录每个场景的
**文本内容哈希 + 音色签名**。只有下面这些情况会重新生成：

- 改了 `text`
- 换了音色 / 换了 provider
- 音频文件被删了

```bash
python scripts/generate_audio.py --only 03-conv   # 只重做一个场景
python scripts/generate_audio.py --force          # 全部重做
python scripts/generate_audio.py --dry-run        # 只看计划和预估费用
```

> **⚠️ 这是老版本的一个真实 bug**：旧脚本只判断「mp3 文件在不在」。
> 改完解说词再跑，它会**默默保留旧音频**，画面和声音就此对不上。
> 现在按内容哈希判断，改了词一定重新生成。

---

## 字幕与语音锚点（Cue）

### 为什么不直接用 Whisper 转写

我们**本来就知道说了什么**——解说词是自己写的。Whisper 擅长判断
「某个词在第几秒被说出」，但它写出来的字经常不对：越南语声调符号、
「二十」写成「20」、中英混说时的拼写。

所以 `align_captions.py` 做的是**强制对齐**：

```
时间戳 ← Whisper
文字   ← script.json
        ↓
两个序列做 difflib 对齐，Whisper 漏掉的词用邻居的时间线性插值
```

结果：字幕拼写永远正确，且每个词都有帧级时间。

```bash
pip install faster-whisper            # 推荐，比 openai-whisper 快很多
python scripts/align_captions.py
python scripts/align_captions.py --model small   # 更快，精度略低
```

生成的 `src/generated/captions.ts` 里，**所有帧号都是场景内相对帧**，
和 `<Sequence>` 里 `useCurrentFrame()` 的语义一致。

### 显示字幕

```tsx
import { CaptionsTrack } from "./Captions";

// 根组件里放一次，自动覆盖所有场景
<CaptionsTrack mode="karaoke" />

// 或者在单个场景的 Sequence 内部
<Captions sceneId="03-conv" mode="karaoke" />
```

| mode | 效果 | 适用 |
|------|------|------|
| `line` | 整行一次性出现 | 画面信息已经很密时 |
| `karaoke` | 整行常驻，当前词高亮 | **默认，最推荐** |
| `reveal` | 逐词出现 | 需要强牵引注意力时 |

**越南语字体**：必须加载带完整声调符号的字体，别指望系统兜底。

```tsx
import { loadFont } from "@remotion/google-fonts/BeVietnamPro";
const { fontFamily } = loadFont();
<CaptionsTrack fontFamily={fontFamily} />
```

### 用 Cue 驱动动画（关键）

这是本 skill 最重要的一条架构原则：

```tsx
// ❌ 硬编码帧号 —— 解说词一改就全乱
<FocusBox startFrame={45} />

// ✅ 锚在台词上 —— 重新配音后动画自动跟着走
import { useCue, useCueProgress, useAfterCue } from "./useCue";

<FocusBox startFrame={useCue("03-conv", "window")} />
```

可用的 hook：

| Hook | 返回 | 用途 |
|------|------|------|
| `useCue(sceneId, name)` | 场景内相对帧 | 元素何时入场 |
| `useAfterCue(sceneId, name, offset?)` | boolean | 条件渲染 |
| `useCueProgress(sceneId, from, to)` | 0→1 | 动画正好跨越对应的那段解说 |
| `useSpokenWordIndex(sceneId)` | 当前词的下标 | 跟读高亮 |
| `useCurrentLine(sceneId)` | 当前字幕行 | 自定义字幕样式 |

典型用法——让滑窗动画正好跟着「相乘…加起来」这段话走：

```tsx
const Scene03: React.FC = () => {
  const step = useCueProgress("03-conv", "multiply", "sum");
  const showResult = useAfterCue("03-conv", "sum");

  return (
    <group>
      <SlidingWindow currentStep={Math.floor(step * 9)} />
      {showResult && <ValueFlyIn value={2.4} startFrame={useCue("03-conv", "writeOut")} />}
    </group>
  );
};
```

cue 找不到时不会崩，会退回 0 并在控制台告警；`align_captions.py`
跑完也会把找不到的 cue 列出来（通常是 `cues` 里的短语和 `text` 对不上）。

---

## 预览循环（渲染前必做）

**问题**：写视频代码是「盲写」——写完只能整段渲染，几分钟后才看到结果，
而绝大多数问题（图像转了 90°、相机抖、文字出画、元素一次性全冒出来）
**看一眼就知道，看代码却看不出来**。

**做法**：低分辨率抽帧，几秒钟出图，然后**真的去看**。

```bash
python scripts/preview.py                      # 每个场景抽 3 帧
python scripts/preview.py --frames-per-scene 5
python scripts/preview.py --scenes 03-conv     # 只看一个场景
python scripts/preview.py --at 0,120,450       # 指定绝对帧
python scripts/preview.py --scale 0.6          # 看细节时调高
```

输出 `out/preview/` 下的单帧 PNG，外加一张把它们拼在一起的 `_sheet.png` 联系表 ——
**看这一张就能同时看到所有抽样帧**，比逐个打开省事得多。

> 联系表上的标签需要 ffmpeg 的 `drawtext` 滤镜（很多 Homebrew 版本没编 libfreetype）
> 或者 Pillow。两个都没有时图还是照出，只是没有烧上去的标签 ——
> 文件名里仍然写着场景和帧号。`pip install pillow` 即可解决。
帧位置由**真实音频时长**推出来，所以抽的是每个场景真正的开头/中间/结尾。

### 自检清单

看图时逐条过一遍（脚本跑完也会打印这份清单）：

| 维度 | 检查 |
|------|------|
| 布局 | 文字出画没有？在安全区内吗？1080p 下最小的字还看得清吗？ |
| 朝向 | 网格/图像有没有被转或镜像？（`row→y` 且要翻转，`col→x`） |
| 节奏 | 元素是依次出现还是一股脑全冒出来？场景第一帧是不是空的？ |
| 相机 | 对比相邻两帧，画面有没有轻微抖动/缩放？ |
| 配色 | 颜色是在表达含义，还是纯装饰？ |
| 内容 | 每个场景是不是只讲一个概念？数值合理吗（进度 >100% 说明忘了 clamp）？ |

3D 场景默认带 `--gl=angle`（见「WebGL 上下文溢出」）。

**迭代节奏**：`改代码 → preview → 看图 → 再改`，确认无误后才整段渲染。
一次抽 12 帧大约十几秒，整段渲染动辄好几分钟——预览这一步几乎总是划算的。

---

## 教程类视频架构（场景驱动）

教程、讲解类视频的核心架构：**音频驱动场景切换**。

### 架构概览

```
script.json → TTS 生成 → audioConfig.ts ┐
                       → captions.ts    ┴→ 场景组件 → 预览抽帧 → 视频渲染
```

关键思想：
1. **音频决定时长**：每个场景的持续时间由音频长度决定，绝不硬编码
2. **场景即章节**：一个概念 = 一个场景 = 一段音频
3. **配置即真理**：`script.json` 是唯一数据源，`src/generated/` 全部自动生成
4. **锚在台词上**：场景内部的动画时机用 cue，不用帧号（见「字幕与语音锚点」）

### 生成产物

`src/generated/audioConfig.ts`（由 `generate_audio.py` 写出，勿手改）：

| 导出 | 说明 |
|------|------|
| `SCENES` | 场景数组：`id` / `title` / `durationInFrames` / `audioFile` / `durationInSeconds` |
| `getSceneStart(i)` | 第 i 个场景的绝对起始帧 |
| `getSceneIndexAtFrame(f)` | 绝对帧落在哪个场景 |
| `FPS` / `TAIL_FRAMES` / `TOTAL_FRAMES` | 帧率与总时长 |

### 场景切换 Hook

切换逻辑已经在生成的配置里，直接用即可：

```tsx
import { useSceneIndex } from "./useCue";
import { SCENES } from "./generated/audioConfig";

const sceneIndex = useSceneIndex();
const currentScene = SCENES[sceneIndex];
```

### 主场景组件模式

```tsx
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { SCENES, getSceneStart } from "./generated/audioConfig";
import { useSceneIndex } from "./useCue";
import { CaptionsTrack } from "./Captions";

export const TutorialVideo: React.FC = () => {
  const { width, height } = useVideoConfig();
  const sceneIndex = useSceneIndex();
  const currentScene = SCENES[sceneIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
      {/* 3D 内容 —— 同一时刻只挂一个 ThreeCanvas，避免 WebGL 上下文溢出 */}
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 4], fov: 50 }}>
        {sceneIndex === 0 && <Scene01Intro />}
        {sceneIndex === 1 && <Scene02Concept />}
        {sceneIndex === 2 && <Scene03Demo />}
      </ThreeCanvas>

      {/* 音频同步 - 每个场景一个 Sequence */}
      {SCENES.map((scene, idx) => (
        <Sequence key={scene.id} from={getSceneStart(idx)} durationInFrames={scene.durationInFrames}>
          <Audio src={staticFile(`audio/${scene.audioFile}`)} />
        </Sequence>
      ))}

      {/* 字幕：一行搞定，帧号由 captions.ts 提供 */}
      <CaptionsTrack mode="karaoke" />

      {/* UI 层：标题 + 进度 */}
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center" }}>
        <h1 style={{ color: "white", fontSize: 42 }}>教程标题</h1>
      </div>
      <div style={{ position: "absolute", bottom: 60, left: 60 }}>
        <span style={{ color: "white" }}>{currentScene?.title}</span>
      </div>
      {/* 进度条 */}
      <div style={{ position: "absolute", bottom: 30, left: 60, right: 60, height: 4, backgroundColor: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${((sceneIndex + 1) / SCENES.length) * 100}%`, height: "100%", backgroundColor: "#3498DB" }} />
      </div>
    </AbsoluteFill>
  );
};
```

### Root.tsx 使用动态帧数

```tsx
import { Composition } from "remotion";
import { TutorialVideo } from "./TutorialVideo";
import { TOTAL_FRAMES } from "./generated/audioConfig";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Tutorial"
      component={TutorialVideo}
      fps={30}
      durationInFrames={TOTAL_FRAMES}  // 从 audioConfig 动态获取
      width={1920}
      height={1080}
    />
  );
};
```

### ⚠️ 教程视频踩坑经验

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 场景切换生硬 | 直接切换无过渡 | 用 spring/interpolate 添加入场动画 |
| 3D 内容与音频不同步 | 硬编码帧数 | 所有时长从 audioConfig 读取 |
| 渲染时 WebGL 崩溃 | 多个 ThreeCanvas 同时存在 | 用 sceneIndex 条件渲染，同时只有一个 3D 场景 |
| 视频太简略 | 只有一个大场景 | **一个概念 = 一个场景组件**，分层讲解 |

### 场景组件设计原则

1. **单一职责**：每个场景组件只负责一个概念
2. **独立动画**：每个场景有自己的 useCurrentFrame()，动画从 0 开始
3. **延迟出现**：用 delay 参数控制元素依次出现
4. **相机适配**：不同场景可能需要不同相机位置

```tsx
// 场景组件示例
const Scene02Input: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 入场动画
  const gridScale = spring({ frame, fps, config: { damping: 15 } });

  return (
    <group>
      <PixelGrid position={[0, 0, 0]} scale={gridScale * 1.5} />
    </group>
  );
};
```

### 相机控制器模式

```tsx
import { useThree } from "@react-three/fiber";

// ✅ 推荐写法：直接设置相机位置，避免插值导致的持续抖动
const CameraController: React.FC<{ sceneIndex: number }> = ({ sceneIndex }) => {
  const { camera } = useThree();

  const cameraSettings: Record<number, [number, number, number]> = {
    0: [0, 0, 4],      // 开场：正面
    1: [0, 0, 3],      // 输入层：靠近
    2: [-0.5, 0, 3.5], // 卷积：偏左
    3: [0, 0, 5],      // 总结：拉远全景
  };

  const target = cameraSettings[sceneIndex] || [0, 0, 4];

  // 直接设置位置，不用插值
  camera.position.set(target[0], target[1], target[2]);
  camera.lookAt(0, 0, 0);

  return null;
};
```

⚠️ **不要用 `position += (target - position) * factor` 这种写法**，永远无法精确收敛，会导致画面持续抖动。详见「🚨 3D 场景常见陷阱 - 陷阱1」。

---

## 常用功能

### 添加视频/音频

```tsx
import { Video, Audio, staticFile } from "remotion";

// 使用 public/ 目录下的文件
<Video src={staticFile("background.mp4")} />
<Audio src={staticFile("music.mp3")} volume={0.5} />

// 外部 URL
<Video src="https://example.com/video.mp4" />
```

### 添加图片

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("logo.png")} style={{ width: 200 }} />
```

### 参数化视频（动态数据）

```tsx
// 定义 props schema
const myCompSchema = z.object({
  title: z.string(),
  bgColor: z.string(),
});

export const MyVideo: React.FC<z.infer<typeof myCompSchema>> = ({ title, bgColor }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <h1>{title}</h1>
    </AbsoluteFill>
  );
};

// 注册时传入默认值
<Composition
  id="MyVideo"
  component={MyVideo}
  schema={myCompSchema}
  defaultProps={{ title: "Hello", bgColor: "#ffffff" }}
  ...
/>
```

## 渲染输出

### CLI 渲染

```bash
# 渲染为 MP4
npx remotion render MyVideo out/video.mp4

# 指定编码器
npx remotion render --codec=h264 MyVideo out/video.mp4

# WebM 格式
npx remotion render --codec=vp8 MyVideo out/video.webm

# GIF
npx remotion render --codec=gif MyVideo out/video.gif

# 仅音频
npx remotion render --codec=mp3 MyVideo out/audio.mp3

# 图片序列
npx remotion render --sequence MyVideo out/frames

# 单帧静态图
npx remotion still MyVideo --frame=30 out/thumbnail.png
```

### 常用渲染参数

| 参数 | 说明 |
|------|------|
| `--codec` | h264, h265, vp8, vp9, gif, mp3, wav 等 |
| `--crf` | 质量 (0-51，越小越好，默认18) |
| `--props` | JSON 格式传入 props |
| `--scale` | 缩放因子 |
| `--concurrency` | 并行渲染数 |

## 高级功能

### 字幕 (@remotion/captions)

```bash
npm i @remotion/captions @remotion/install-whisper-cpp
npx remotion-install-whisper-cpp  # 安装 Whisper
```

```ts
import { transcribe } from "@remotion/install-whisper-cpp";

const { transcription } = await transcribe({
  inputPath: "audio.mp3",
  whisperPath: whisperCppPath,
  model: "medium",
});
```

### 播放器嵌入 Web 应用

```bash
npm i @remotion/player
```

```tsx
import { Player } from "@remotion/player";
import { MyVideo } from "./MyVideo";

<Player
  component={MyVideo}
  durationInFrames={150}
  fps={30}
  compositionWidth={1920}
  compositionHeight={1080}
  style={{ width: "100%" }}
  controls
  inputProps={{ title: "Dynamic Title" }}
/>
```

### AWS Lambda 渲染

```bash
npm i @remotion/lambda
npx remotion lambda policies role   # 设置 IAM
npx remotion lambda sites create    # 部署站点
npx remotion lambda render <site-url> MyVideo  # 渲染
```

## 3D 视频制作（@remotion/three）

使用 React Three Fiber 在 Remotion 中创建 3D 动画视频。

### 适用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| 产品展示 | 3D 模型旋转、拆解动画 | 手机产品宣传片 |
| 角色动画 | 卡通角色讲解、故事叙述 | 育儿科普视频 |
| 数据可视化 | 3D 图表、空间数据 | 地理信息、建筑展示 |
| Logo 动画 | 品牌 3D Logo 入场 | 片头片尾 |

### 安装

```bash
npm i three @react-three/fiber @remotion/three @types/three
```

**官方模板**（推荐新手）：

```bash
npx create-video@latest --template three
```

### 基础示例

```tsx
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

// 3D 场景组件
const My3DScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const camera = useThree((state) => state.camera);

  // 设置相机
  useEffect(() => {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // 旋转动画
  const rotation = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);

  // 弹性入场
  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });

  return (
    <mesh rotation={[0, rotation, 0]} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  );
};

// 视频组件
export const My3DVideo = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas width={width} height={height}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <My3DScene />
    </ThreeCanvas>
  );
};
```

### 加载 GLTF 模型

```tsx
import { useGLTF } from "@react-three/drei";
import { useCurrentFrame, interpolate } from "remotion";

const Model = () => {
  const frame = useCurrentFrame();
  const { scene } = useGLTF("/models/character.glb");

  const rotation = interpolate(frame, [0, 150], [0, Math.PI * 2]);

  return <primitive object={scene} rotation={[0, rotation, 0]} scale={0.5} />;
};
```

**安装 drei**（React Three Fiber 工具库）：

```bash
npm i @react-three/drei
```

### 视频作为 3D 纹理

```tsx
import { ThreeCanvas, useVideoTexture } from "@remotion/three";
import { staticFile, useVideoConfig } from "remotion";

const VideoOnMesh = () => {
  const { width, height } = useVideoConfig();
  const videoTexture = useVideoTexture(staticFile("/video.mp4"));

  return (
    <ThreeCanvas width={width} height={height}>
      <mesh>
        <planeGeometry args={[4, 3]} />
        {videoTexture && <meshBasicMaterial map={videoTexture} />}
      </mesh>
    </ThreeCanvas>
  );
};
```

渲染时使用 `useOffthreadVideoTexture()` 确保帧精确：

```tsx
import { useOffthreadVideoTexture } from "@remotion/three";

const texture = useOffthreadVideoTexture({ src: staticFile("/video.mp4") });
```

### 3D 角色组合技巧

用基础几何体组合角色（无需专业建模）：

```tsx
// 简单卡通角色：头 + 身体 + 四肢
const CartoonCharacter = ({ emotion = "happy" }) => {
  const frame = useCurrentFrame();

  // 表情控制
  const eyeScale = emotion === "happy" ? 1 : 0.5;
  const mouthRotation = emotion === "happy" ? 0 : Math.PI;

  // 走路动画：腿部摆动
  const legSwing = Math.sin(frame * 0.2) * 0.3;

  return (
    <group>
      {/* 头部 - 球体 */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FFE4C4" />
      </mesh>

      {/* 身体 - 胶囊体 */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 16, 32]} />
        <meshStandardMaterial color="#4169E1" />
      </mesh>

      {/* 左腿 */}
      <mesh position={[-0.15, -0.3, 0]} rotation={[legSwing, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* 右腿 */}
      <mesh position={[0.15, -0.3, 0]} rotation={[-legSwing, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
};
```

### ⚠️ 踩坑经验

#### WebGL 上下文溢出

**问题**：多个 3D 场景同时渲染时报错 `Error creating WebGL context`

**原因**：浏览器限制 WebGL 上下文数量（通常 8-16 个）

**解决方案**：

1. **渲染配置**：使用 `angle` OpenGL 引擎

```ts
// remotion.config.ts
export default {
  chromiumOptions: {
    gl: "angle",  // 或 "angle-egl"
  },
};
```

CLI 渲染时：

```bash
npx remotion render --gl=angle MyVideo out.mp4
```

2. **懒加载场景**：只渲染当前帧附近的 3D 内容

```tsx
import { useCurrentFrame } from "remotion";

const LazyScene = ({ sceneStart, sceneDuration, children }) => {
  const frame = useCurrentFrame();
  const buffer = 30; // 缓冲 30 帧

  // 只在场景时间范围 ± buffer 内渲染
  const shouldRender =
    frame >= sceneStart - buffer &&
    frame <= sceneStart + sceneDuration + buffer;

  if (!shouldRender) {
    return null; // 不渲染，释放 WebGL 上下文
  }

  return <>{children}</>;
};

// 使用
<Sequence from={0} durationInFrames={150}>
  <LazyScene sceneStart={0} sceneDuration={150}>
    <Scene1 />
  </LazyScene>
</Sequence>
<Sequence from={150} durationInFrames={150}>
  <LazyScene sceneStart={150} sceneDuration={150}>
    <Scene2 />
  </LazyScene>
</Sequence>
```

#### 服务端渲染配置

服务端渲染（SSR）必须配置 `gl` 选项：

```ts
// renderMedia() / renderFrames() / getCompositions()
await renderMedia({
  composition,
  serveUrl,
  outputLocation: "out.mp4",
  chromiumOptions: {
    gl: "angle",
  },
});
```

#### Sequence 内的 useCurrentFrame

`<Sequence>` 内部的 `useCurrentFrame()` 返回的是**相对于 Sequence 开始的帧号**，不是全局帧号。

```tsx
<Sequence from={60} durationInFrames={90}>
  <MyScene />  {/* 这里 useCurrentFrame() 从 0 开始，不是 60 */}
</Sequence>
```

### 进阶资源

| 资源 | 用途 | 链接 |
|------|------|------|
| **Mixamo** | 免费骨骼动画库 | https://www.mixamo.com |
| **Sketchfab** | 免费/付费 3D 模型 | https://sketchfab.com |
| **Ready Player Me** | 虚拟人物生成 | https://readyplayer.me |
| **Spline** | 在线 3D 设计工具 | https://spline.design |
| **gltfjsx** | GLTF 转 React 组件 | `npx gltfjsx model.glb` |

### 进阶方向

1. **Blender → GLTF**：用 Blender 建模，导出 GLTF 格式，用 `useGLTF` 加载
2. **Mixamo 动画**：下载 FBX 动画，转换为 GLTF，用 `useAnimations` 播放
3. **Spline 设计**：在 Spline 设计 3D 场景，用 `@splinetool/r3f-spline` 导入

---

## 3Blue1Brown 风格指南（教程类视频）

针对教程、讲解类视频，借鉴 3Blue1Brown 的可视化设计原则。

### 核心理念

```
3B1B 内核：让观众「自己发现」，而不是「被告知答案」
```

| 原则 | 说明 | 示例 |
|------|------|------|
| **Why → What** | 先提问为什么，再展示是什么 | "如何识别手写数字？" → 展示神经网络 |
| **逐步构建** | 元素一个个出现，不要整体淡入 | 神经元依次点亮，而非同时出现 |
| **颜色有语义** | 颜色传达信息，不是装饰 | 蓝=正、红=负、黄=高亮 |
| **数值具象化** | 显示具体数字让抽象概念落地 | 像素值 0.7、激活值 0.92 |
| **2D 优先** | 清晰优先于炫酷，必要时才用 3D | 网络结构用 2D，空间数据用 3D |

### 配色方案

```tsx
// 3B1B 风格配色（语义化）
const COLORS_3B1B = {
  background: "#000000",     // 纯黑背景
  positive: "#58C4DD",       // 蓝色 - 正权重/正向
  negative: "#FF6B6B",       // 红色 - 负权重/负向
  highlight: "#FFFF00",      // 黄色 - 当前焦点/高亮
  result: "#83C167",         // 绿色 - 结果/正确
  text: "#FFFFFF",           // 白色 - 文字
  neutral: "#888888",        // 灰色 - 中性/未激活
  accent: "#FF8C00",         // 橙色 - 强调
};

// 使用示例
<meshStandardMaterial
  color={weight > 0 ? COLORS_3B1B.positive : COLORS_3B1B.negative}
  emissive={isHighlighted ? COLORS_3B1B.highlight : "#000"}
  emissiveIntensity={isHighlighted ? 0.3 : 0}
/>
```

### 2D/3D 混合策略

| 内容类型 | 推荐维度 | 原因 |
|----------|----------|------|
| 网络结构图 | 2D | 层次清晰，易于标注 |
| 数据流向 | 2D + 动画箭头 | 强调顺序和因果 |
| 卷积操作 | 2D 俯视图 | 网格对齐，数值可见 |
| 特征图堆叠 | 2.5D（透视） | 展示深度/通道数 |
| 3D 物体识别 | 3D | 内容本身是 3D |

**2D 模式实现**：使用正交相机 + 扁平几何体

```tsx
import { OrthographicCamera } from "@react-three/drei";

// 正交相机 = 无透视变形 = 2D 感觉
<OrthographicCamera makeDefault position={[0, 0, 10]} zoom={100} />

// 扁平几何体
<mesh>
  <planeGeometry args={[1, 1]} />  {/* 2D 平面 */}
  <meshBasicMaterial color={color} />
</mesh>
```

### 逐步构建动画

**核心**：用 `delay` 参数控制元素依次出现

```tsx
// 批量元素逐个出现
const StaggeredGroup: React.FC<{
  children: React.ReactNode[];
  delayPerItem?: number
}> = ({ children, delayPerItem = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {React.Children.map(children, (child, i) => {
        const delay = i * delayPerItem;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        if (frame < delay) return null;

        return (
          <group scale={Math.max(0, progress)} opacity={progress}>
            {child}
          </group>
        );
      })}
    </>
  );
};

// 使用
<StaggeredGroup delayPerItem={10}>
  <Neuron position={[0, 0, 0]} />
  <Neuron position={[1, 0, 0]} />
  <Neuron position={[2, 0, 0]} />
</StaggeredGroup>
```

### 数值标签组件

```tsx
import { Text } from "@react-three/drei";

const ValueLabel: React.FC<{
  value: number;
  position: [number, number, number];
  fontSize?: number;
}> = ({ value, position, fontSize = 0.15 }) => {
  // 根据值选择颜色
  const color = value > 0.5 ? COLORS_3B1B.positive :
                value < -0.5 ? COLORS_3B1B.negative :
                COLORS_3B1B.neutral;

  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      font="/fonts/JetBrainsMono-Regular.ttf"  // 等宽字体
    >
      {value.toFixed(2)}
    </Text>
  );
};
```

### 高亮焦点组件

```tsx
// 脉冲高亮框 - 引导注意力
const FocusBox: React.FC<{
  position: [number, number, number];
  size: [number, number];
  label?: string;
}> = ({ position, size, label }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame * 0.15) * 0.08;

  return (
    <group position={position}>
      {/* 高亮框 */}
      <mesh scale={[pulse, pulse, 1]}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={COLORS_3B1B.highlight}
          transparent
          opacity={0.2}
        />
      </mesh>
      {/* 边框 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(...size)]} />
        <lineBasicMaterial color={COLORS_3B1B.highlight} linewidth={2} />
      </lineSegments>
      {/* 标签 */}
      {label && (
        <Text position={[0, size[1] / 2 + 0.2, 0]} fontSize={0.12} color={COLORS_3B1B.highlight}>
          {label}
        </Text>
      )}
    </group>
  );
};
```

### 脚本撰写指南（教程类）

**❌ 宣布式（避免）**：
```
"首先是输入层。图像是一个数字矩阵。"
"接下来是卷积层。卷积核在图像上滑动。"
```

**✅ 探索式（推荐）**：
```
"你能轻松认出这是数字 7，但你能描述你是怎么做到的吗？
（停顿 1 秒）
这正是神经网络要解决的问题。

让我们先看看计算机「看到」的是什么——
（数字网格逐个显示）
不是图像，而是 784 个数字。

那么问题来了：如何从这堆数字中识别出 7？"
```

**脚本结构模板**：

```
1. 🎯 提出问题（10%）
   - 用观众能共鸣的问题开场
   - "你有没有想过..."

2. 🤔 直觉猜测（15%）
   - 引导观众思考可能的方案
   - "也许我们可以..."

3. 🔍 逐步验证（50%）
   - 一步步展示机制
   - 每一步都回答「为什么这样设计」

4. 📐 形式化（15%）
   - 展示数学公式（可选）
   - 将直觉转化为精确描述

5. 🎬 回顾总结（10%）
   - 完整流程快速回放
   - 强调核心洞见
```

### ⚠️ 常见误区

| 误区 | 问题 | 改进 |
|------|------|------|
| 3D 炫技 | 旋转、透视分散注意力 | 用最简单的视角表达 |
| 颜色随意 | 红绿蓝只是装饰 | 建立颜色-含义映射 |
| 整体出现 | 观众不知道看哪里 | 逐个元素 + 高亮引导 |
| 只说 What | 观众不理解设计动机 | 先问 Why 再展示 What |
| 信息过载 | 一个场景塞太多概念 | 一个场景一个概念 |

---

## 过程动画模式（Process Animation）

**核心理念**：不只展示「是什么」，更要展示「怎么算」。让观众亲眼看到数据如何流动、计算如何发生。

### 适用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| 算法可视化 | 展示每一步操作 | 排序、搜索、图遍历 |
| 数学公式推导 | 逐项展开计算 | 矩阵乘法、卷积运算 |
| 数据处理流程 | 输入→变换→输出 | CNN 前向传播、数据清洗 |
| 决策过程 | 比较、筛选、最终选择 | 池化取最大值、softmax |

### 动画模式分类

```
静态展示 → 结构动画 → 过程动画
   ↓           ↓           ↓
  截图      元素出现     计算过程
            淡入淡出     数据流动
            相机移动     结果写入
```

### 过程动画组件库

#### 1. 计算步骤展示（StepByStep）

```tsx
// 逐步显示计算过程
const StepByStepCalc: React.FC<{
  steps: string[];      // ["1×0.5", "+ 0×0.3", "+ 1×(-0.2)", "= 0.3"]
  startFrame: number;
  framesPerStep?: number;
}> = ({ steps, startFrame, framesPerStep = 20 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ fontFamily: "monospace", fontSize: 24, color: "white" }}>
      {steps.map((step, i) => {
        const stepStart = startFrame + i * framesPerStep;
        const opacity = interpolate(frame, [stepStart, stepStart + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isResult = i === steps.length - 1;

        return (
          <span
            key={i}
            style={{
              opacity,
              color: isResult ? COLORS.result : COLORS.text,
              fontWeight: isResult ? "bold" : "normal",
            }}
          >
            {step}{" "}
          </span>
        );
      })}
    </div>
  );
};
```

#### 2. 数值飞入动画（ValueFlyIn）

```tsx
// 计算结果飞入目标位置
const ValueFlyIn: React.FC<{
  value: number;
  from: [number, number, number];
  to: [number, number, number];
  startFrame: number;
  duration?: number;
}> = ({ value, from, to, startFrame, duration = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  if (frame < startFrame) return null;

  const position: [number, number, number] = [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
    from[2] + (to[2] - from[2]) * progress,
  ];

  const scale = 1.5 - 0.5 * progress; // 飞行时放大，落地时缩小

  return (
    <Text
      position={position}
      fontSize={0.12 * scale}
      color={COLORS.result}
      anchorX="center"
      anchorY="middle"
    >
      {value.toFixed(1)}
    </Text>
  );
};
```

#### 3. 区域高亮比较（CompareHighlight）

```tsx
// 多个值依次比较，胜出者高亮
const CompareHighlight: React.FC<{
  values: number[];
  positions: [number, number, number][];
  startFrame: number;
  framesPerCompare?: number;
}> = ({ values, positions, startFrame, framesPerCompare = 15 }) => {
  const frame = useCurrentFrame();

  // 计算当前比较进度
  const compareIndex = Math.floor((frame - startFrame) / framesPerCompare);
  const maxIndex = values.indexOf(Math.max(...values));

  return (
    <>
      {values.map((value, i) => {
        const isComparing = i <= compareIndex && i <= maxIndex;
        const isWinner = compareIndex >= values.length - 1 && i === maxIndex;

        return (
          <group key={i} position={positions[i]}>
            <mesh>
              <boxGeometry args={[0.2, 0.2, 0.02]} />
              <meshStandardMaterial
                color={isWinner ? COLORS.result : isComparing ? COLORS.highlight : COLORS.dim}
                emissive={isWinner ? COLORS.result : "#000"}
                emissiveIntensity={isWinner ? 0.5 : 0}
              />
            </mesh>
            <Text position={[0, 0, 0.02]} fontSize={0.08} color="#000">
              {value}
            </Text>
          </group>
        );
      })}
    </>
  );
};
```

#### 4. 滑动窗口（SlidingWindow）

```tsx
// 卷积核/池化窗口滑动
const SlidingWindow: React.FC<{
  gridSize: number;         // 输入网格大小
  windowSize: number;       // 窗口大小 (3 for 3x3)
  stride: number;           // 步幅
  currentStep: number;      // 当前步骤 (0, 1, 2, ...)
  onPositionChange?: (row: number, col: number) => void;
}> = ({ gridSize, windowSize, stride, currentStep }) => {
  const outputSize = Math.floor((gridSize - windowSize) / stride) + 1;
  const totalSteps = outputSize * outputSize;
  const step = Math.min(currentStep, totalSteps - 1);

  const row = Math.floor(step / outputSize) * stride;
  const col = (step % outputSize) * stride;

  // 窗口位置（相对于网格中心）
  const pixelSize = 0.12;
  const gap = 0.01;
  const offset = (gridSize / 2 - 0.5) * (pixelSize + gap);
  const windowOffset = (windowSize / 2 - 0.5) * (pixelSize + gap);

  const x = col * (pixelSize + gap) - offset + windowOffset;
  const y = row * (pixelSize + gap) - offset + windowOffset;

  return (
    <mesh position={[x, y, 0.05]}>
      <boxGeometry args={[windowSize * pixelSize + (windowSize - 1) * gap,
                          windowSize * pixelSize + (windowSize - 1) * gap, 0.02]} />
      <meshStandardMaterial
        color={COLORS.negative}
        transparent
        opacity={0.6}
        emissive={COLORS.negative}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};
```

### 脚本撰写指南（过程动画版）

**关键转变**：脚本需要配合动画节奏，给动画「留白时间」。

**❌ 传统脚本（信息密集）**：
```
"卷积核在图像上滑动，每到一个位置就做点乘运算，得到一个数值。"
（一句话带过，观众还没看清发生了什么）
```

**✅ 过程动画脚本（留白配合）**：
```
"让我们看看卷积是怎么计算的。"
（停顿 - 窗口移动到位置）

"卷积核覆盖了这 9 个像素。"
（停顿 - 高亮 3x3 区域）

"我们把每个像素值，和对应的权重相乘..."
（停顿 - 逐步显示乘法）

"然后把所有结果加起来。"
（停顿 - 显示求和过程）

"得到的这个数字，就写入特征图的对应位置。"
（停顿 - 结果飞入）

"第一个位置完成了。接下来，窗口向右滑动一格..."
（加速展示后续步骤）
```

### 时间分配建议

| 详细程度 | 首次完整展示 | 重复加速 | 适用场景 |
|----------|--------------|----------|----------|
| 极详细 | 3-4 秒/步 | 0.5 秒/步 | 核心概念首次出现 |
| 中等 | 2 秒/步 | 0.3 秒/步 | 辅助概念 |
| 快速 | 1 秒/步 | 闪过 | 已解释过的重复 |

**示例：卷积场景时间分配**

```
总时长：~25 秒

0-3s:   引入（"让我们看看卷积是怎么计算的"）
3-12s:  第 1 次卷积（完整详细展示）
        - 窗口移动 (1s)
        - 高亮区域 (1s)
        - 计算过程 (4s)
        - 结果飞入 (2s)
        - 解说旁白 (1s)
12-18s: 第 2-3 次卷积（中等速度，简化解说）
18-23s: 剩余位置（快速滑动，仅显示结果）
23-25s: 展示完整特征图
```

### ⚠️ 过程动画踩坑经验

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 动画太快看不清 | 时间分配不足 | 增加关键步骤的帧数 |
| 解说与动画不同步 | 脚本没有留白 | 重写脚本，加入停顿标记 |
| 信息过载 | 一次展示太多 | 分阶段：先结构，再过程 |
| 重复内容无聊 | 每次都详细展示 | 首次详细 + 后续加速 |
| 数值太小看不见 | 3D 文字渲染问题 | 用 2D HTML overlay |
| **相机持续抖动** | 插值永不收敛 | 见下方「相机控制陷阱」 |
| **图像旋转90度** | 行列坐标映射反了 | 见下方「网格坐标陷阱」 |
| **进度显示好几千%** | progress 变量未 clamp | `Math.min(1, (frame - start) / duration)` |
| **特征图只有色块无数值** | 组件缺少数值显示功能 | 添加 `values` + `showValues` 参数 |

#### 进度变量必须 clamp

```tsx
// ❌ 错误：场景持续时间可能远超预期，progress 会变成 5000%
const calcProgress = frame > 30 ? (frame - 30) / 60 : 0;

// ✅ 正确：限制在 [0, 1] 范围
const calcProgress = frame > 30 ? Math.min(1, (frame - 30) / 60) : 0;
```

#### 特征图显示计算结果

```tsx
// FeatureMap 组件应支持显示数值
<FeatureMap
  position={[2, 0, 0]}
  size={0.6}
  count={1}
  color={COLORS.result}
  filledCells={filledCount}
  gridSize={6}
  values={[2, -1, 0, 3, ...]}  // 每个格子的计算结果
  showValues                    // 启用数值显示
/>
```

### 🚨 3D 场景常见陷阱

#### 陷阱 1：相机持续抖动

**症状**：画面一直微微放大-缩小抖动

**错误写法**：
```tsx
// ❌ 永远无法精确到达目标，导致持续微抖动
const CameraController = ({ targetZ }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();

  useEffect(() => {
    camera.position.z += (targetZ - camera.position.z) * 0.05;
  }, [frame]);

  return null;
};
```

**正确写法**：
```tsx
// ✅ 方案A：使用 spring 动画（推荐）
const CameraController = ({ targetZ, transitionFrame = 0 }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const z = spring({
    frame: frame - transitionFrame,
    fps,
    from: camera.position.z,
    to: targetZ,
    config: { damping: 20, stiffness: 100 },
  });

  camera.position.z = z;
  return null;
};

// ✅ 方案B：直接设置（无过渡）
const CameraController = ({ targetZ }) => {
  const { camera } = useThree();
  camera.position.set(0, 0, targetZ);
  camera.lookAt(0, 0, 0);
  return null;
};

// ✅ 方案C：插值但加阈值
useEffect(() => {
  const delta = targetZ - camera.position.z;
  if (Math.abs(delta) < 0.001) {
    camera.position.z = targetZ; // 接近时直接设置
  } else {
    camera.position.z += delta * 0.1;
  }
}, [frame]);
```

#### 陷阱 2：网格图像旋转90度

**症状**：本应显示为正常方向的图像（如数字7）被旋转了90度

**根因**：图像处理中 `row` 对应 y 轴（从上到下），`col` 对应 x 轴（从左到右），
但代码里把行索引映射到了 x 坐标，列索引映射到了 y 坐标。

**错误写法**：
```tsx
// ❌ row 映射到 x，col 映射到 y，图像会旋转90度
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const x = (row - size/2) * cellSize;  // 错！row 应该是 y
    const y = (col - size/2) * cellSize;  // 错！col 应该是 x
    // ...
  }
}
```

**正确写法**：
```tsx
// ✅ col 映射到 x，row 映射到 y（且 y 要翻转）
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const x = (col - size/2 + 0.5) * cellSize;           // col → x
    const y = ((size - 1 - row) - size/2 + 0.5) * cellSize; // row → y（翻转）
    // ...
  }
}
```

**记忆口诀**：
- 图像坐标：`image[row][col]` = `image[y][x]`（行是y，列是x）
- 3D 坐标：x 向右，y 向上
- 翻转 row：图像 row=0 在顶部，3D y=max 在顶部

---

## 工作流最佳实践

### 推荐的 npm scripts 配置

```json
{
  "scripts": {
    "dev": "remotion studio",
    "audio": "python3 scripts/generate_audio.py",
    "captions": "python3 scripts/align_captions.py",
    "preview": "python3 scripts/preview.py",
    "prepare": "npm run audio && npm run captions",
    "render": "remotion render Main out/video.mp4 --gl=angle",
    "build": "npm run prepare && npm run preview && npm run render"
  }
}
```

### 标准迭代循环

```
改 script.json ──▶ npm run prepare ──┐
                                      ├──▶ npm run preview ──▶ 看图 ──▶ 满意？
改场景组件 ─────────────────────────┘                             │
      ▲                                                            │ 否
      └────────────────────────────────────────────────────────────┘
                                                                   │ 是
                                                    npm run render ─┘
```

**不要跳过 preview 直接 render。** 整段渲染要好几分钟，抽帧只要十几秒，
而且大多数问题只有看图才发现得了。

### 实时进度显示

音频生成和视频渲染都可能耗时较长，**务必使用前台执行**以便看到进度：

```bash
# ✅ 推荐：前台执行，实时显示进度
npm run audio
npm run render

# ✅ 或者用 shell 脚本封装
bash scripts/render.sh

# ❌ 避免：后台执行看不到进度
npm run render &
```

**render.sh 示例**：
```bash
#!/bin/bash
cd "$(dirname "$0")/.."
echo "🎬 开始渲染视频..."
npx remotion render MyVideo out/video.mp4
if [ $? -eq 0 ]; then
    echo "✅ 渲染完成!"
    ls -lh out/video.mp4
else
    echo "❌ 渲染失败"
    exit 1
fi
```

### 断点续作设计原则

长时间任务（如批量生成音频）应支持断点续作：

1. **检查已存在文件**：跳过已完成的项目
2. **原子操作**：单个文件生成失败不影响已完成的
3. **进度保存**：失败时保留已完成的部分
4. **幂等执行**：重复运行产生相同结果

## 调试技巧

1. **Studio 热重载**：`npm run dev` 实时预览
2. **检查帧**：Studio 中拖动时间轴逐帧检查
3. **性能**：避免在组件内做重计算，用 `useMemo`
4. **静态文件**：放在 `public/` 目录，用 `staticFile()` 引用

## 常见问题

**Q: 视频渲染很慢？**
- 使用 `--concurrency` 增加并行数
- 降低分辨率测试：`--scale=0.5`
- 考虑 AWS Lambda 分布式渲染

**Q: 字体不显示？**
- 使用 `@remotion/google-fonts` 或本地加载
- 确保字体在渲染前已加载

**Q: 视频素材不播放？**
- 检查视频编码格式（推荐 H.264）
- 使用 `<OffthreadVideo>` 替代 `<Video>` 提升性能

## 参考资源

- 官方文档：https://remotion.dev/docs
- 模板库：https://remotion.dev/templates
- GitHub：https://github.com/remotion-dev/remotion
