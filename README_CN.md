# prompt-to-video

[English](README.md)

使用 Remotion 框架编程式创建视频的 Claude Code Skill —— 带 AI 配音、
自动生成帧级对齐的字幕，并在渲染前抽帧自检。

<p align="center">
  <img src="examples/preview.gif" width="280" alt="示例：一个球滚下损失函数山谷，全程由本 skill 生成" />
</p>

<p align="center"><em>↑ 4.5 秒片段，完整视频见 <a href="examples/gradient-descent.mp4">examples/gradient-descent.mp4</a></em></p>

## 功能特点

- 使用 React 组件编程式创建视频
- **三种 TTS，按机器上实际可用的自动挑选**：
  - [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) —— 本地、免费、越南语/英语、3–8 秒即时克隆音色
  - MiniMax —— 云端、付费、支持克隆、多语言
  - Edge TTS —— 云端、免费、固定音色
- **帧级字幕**：Whisper 强制对齐 —— 时间戳取自 Whisper，文字取自你的脚本，
  所以字幕拼写永远正确
- **语音锚点（cue）**：动画锚在「这句话被说出的那一刻」，而不是写死的帧号；
  重新配音后动画自动跟着走
- **预览循环**：几秒钟抽出若干帧，先肉眼看过再决定要不要跑几分钟的整段渲染
- 基于场景的架构，时长由音频决定

## 安装

将整个文件夹复制到 Claude Code skills 目录：

```bash
git clone https://github.com/Thach45/prompt-to-video.git
cp -r prompt-to-video ~/.claude/skills/remotion-video
```

然后重启 Claude Code 或开启新会话。

### 依赖

```bash
brew install ffmpeg              # macOS   （Ubuntu: sudo apt install ffmpeg）
pip install faster-whisper       # 字幕与 cue 对齐
pip install pillow               # 可选：给预览图加标签
```

再至少装一个 TTS：

```bash
pip install vieneu               # 本地、免费、越南语/英语（推荐）
pip install edge-tts             # 云端、免费、固定音色
# 或者用 MiniMax：
export MINIMAX_API_KEY="你的API密钥" MINIMAX_VOICE_ID="你的音色ID"
```

`script.json` 里写 `"provider": "auto"` 就会自动挑选可用的那个。

`templates/script.example.json` 自带一个已经克隆好的默认音色 ——
`templates/voices/nhat-phong.wav`（男声、叙述风格），新项目开箱即用不用额外配置。
想换成自己的参考音频或内置预设音色，改 `vieneu` 那段配置即可
（文件里有对应注释）。

## 使用方法

安装后，通过以下方式触发：

- "用代码做视频" / "编程视频" / "自动字幕"
- "làm video bằng code" / "lồng tiếng AI"
- "Remotion" / "/remotion-video"

### 示例提示词

**教程视频：**
> 帮我做一个讲解 Python 装饰器的教程视频，5分钟左右

**数据可视化：**
> 用 Remotion 做一个展示 2024 年销售数据的动画视频

**音乐可视化：**
> 帮我做一个音乐可视化视频，配合这首歌的节奏

## 流水线

**唯一数据源是 `script.json`**，其余全部自动生成。

```
script.json  ──generate_audio.py──▶  public/audio/*.mp3
                                     src/generated/audioConfig.ts
             ──align_captions.py──▶  src/generated/captions.ts   （字幕 + cue）
             ──preview.py─────────▶  out/preview/*.png           （渲染前肉眼检查）
```

```bash
python scripts/generate_audio.py     # 增量：只有文本/音色变了才重新生成
python scripts/align_captions.py     # 字幕 + 语音锚点
python scripts/preview.py            # 抽帧预览 —— 别跳过这一步
npx remotion render Main out/video.mp4
```

## 项目结构

```
my-video-project/
├── script.json             # 解说词、音色、cue —— 唯一需要手改的文件
├── src/
│   ├── Root.tsx
│   ├── generated/          # 自动生成，勿手改
│   │   ├── audioConfig.ts  #   场景时长
│   │   └── captions.ts     #   逐词字幕 + cue 帧号
│   ├── useCue.ts           # hooks：useCue / useCueProgress / useAfterCue …
│   ├── Captions.tsx        # <CaptionsTrack /> 字幕组件
│   └── scenes/
├── public/audio/           # 生成的配音
├── out/preview/            # 预览帧
└── scripts/
    ├── generate_audio.py
    ├── align_captions.py
    └── preview.py
```

## 环境要求

- Node.js 18+
- Python 3.9+
- ffmpeg / ffprobe

## 致谢

- Fork 自 [wshuyi/remotion-video-skill](https://github.com/wshuyi/remotion-video-skill)
- [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) 提供本地越南语配音与克隆
- [Remotion](https://remotion.dev) 让视频即 React 成为可能

## 许可证

MIT —— 见 [LICENSE](LICENSE)
