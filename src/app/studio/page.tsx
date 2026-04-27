"use client";

import React, { useState } from "react";
import { Player } from "@remotion/player";
import {
  Play,
  Settings,
  Video,
  Code2,
  Copy,
  Check,
  Wand2,
  CornerDownLeft,
  Loader2,
  Plus,
  X,
  Mic,
  Music,
} from "lucide-react";
import { ShortVideoTemplate } from "@/template/ShareNews";
import { TemplateTechnical } from "@/template/TemplateTechnical";
import { clampVideoSpec, defaultVideoSpec, type VideoSpec } from "@/lib/video-spec";

type PanelTab = "code" | "preview";
type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; text: string };
type TemplateId = VideoSpec["templateId"];
type TemplateSelection = TemplateId | "auto";
type TemplateOption = { id: TemplateId; label: string; description: string };

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "technical",
    label: "Technical",
    description: "Noi dung engineering, AI, devops, security, system.",
  },
  {
    id: "share-news",
    label: "Share News",
    description: "Noi dung social, tin nhanh, thong bao, marketing.",
  },
];

const VOICE_OPTIONS = [
  { id: "vi-VN-HoaiMyNeural", label: "Hoài My (Nữ)", gender: "female" },
  { id: "vi-VN-NamMinhNeural", label: "Nam Minh (Nam)", gender: "male" },
  { id: "local-nhat-phong", label: "Nhật Phong (Local AI)", gender: "male" },
  { id: "en-US-EmmaMultilingualNeural", label: "Emma (English)", gender: "female" },
];

const buildJsonSample = (spec: VideoSpec) => JSON.stringify(spec, null, 2);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getAudioDuration = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => {
      resolve(0); // Fallback
    };
  });
};

export default function StudioPage() {
  const [tab, setTab] = useState<PanelTab>("preview");
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamStatus, setStreamStatus] = useState("Dang cho...");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoSpec, setVideoSpec] = useState<VideoSpec>(defaultVideoSpec);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [editableJson, setEditableJson] = useState(buildJsonSample(defaultVideoSpec));
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSelection>("auto");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const PreviewComponent =
    videoSpec.templateId === "technical" ? TemplateTechnical : ShortVideoTemplate;
  const selectedTemplateOption =
    selectedTemplate === "auto"
      ? null
      : TEMPLATE_OPTIONS.find((option) => option.id === selectedTemplate) ?? null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(editableJson) as Partial<VideoSpec>;
      const normalized = clampVideoSpec(parsed);
      setVideoSpec(normalized);
      setEditableJson(buildJsonSample(normalized));
      setHasGenerated(true);
      setErrorMessage(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Da apply JSON thanh cong (${normalized.templateId}).`,
        },
      ]);
      setTab("preview");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "JSON khong hop le.";
      setErrorMessage(`Khong the apply JSON: ${message}`);
    }
  };

  const handleGenerate = async () => {
    const prompt = inputText.trim();
    if (!prompt || isGenerating) {
      return;
    }
    const templateId = selectedTemplate === "auto" ? undefined : selectedTemplate;

    setIsGenerating(true);
    setStreamStatus("Đang tạo video....");
    setErrorMessage(null);
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setInputText("");

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, templateId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Khong the ket noi stream tu server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generatedSpec: VideoSpec | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event: "));
          const dataLine = lines.find((line) => line.startsWith("data: "));

          if (!eventLine || !dataLine) {
            continue;
          }

          const eventName = eventLine.slice(7).trim();
          const data = JSON.parse(dataLine.slice(6)) as {
            stage?: string;
            message?: string;
            spec?: VideoSpec;
            error?: string;
            detail?: string;
          };

          if (eventName === "progress") {
            setStreamStatus(data.message ?? "Đang xử lý...");
          }

          if (eventName === "done" && data.spec) {
            generatedSpec = data.spec;
          }

          if (eventName === "error") {
            throw new Error(data.error ?? data.detail ?? "Gemini stream error.");
          }
        }
      }

      if (!generatedSpec) {
        throw new Error("Khong nhan duoc ket qua tu stream.");
      }

      setVideoSpec(generatedSpec);
      
      // --- AUDIO GENERATION STAGE ---
      setStreamStatus("Đang lồng tiếng...");
      const updatedScenes = [...generatedSpec.scenes];
      let totalFrames = 0;

      for (let i = 0; i < updatedScenes.length; i++) {
        const scene = updatedScenes[i];
        if (scene.voiceover) {
          let success = false;
          let retries = 10;
          
          while (!success && retries > 0) {
            try {
              // Thêm delay nhỏ giữa các request để tránh rate limit của Edge TTS
              const isLocal = selectedVoice === "local-nhat-phong";
              const endpoint = isLocal ? "/api/local-tts" : "/api/tts";
              
              // Local TTS không cần delay lâu như Edge TTS
              if (i > 0) await sleep(isLocal ? 500 : 3000); 

              const ttsResponse = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: scene.voiceover, voice: selectedVoice }),
              });
              
              if (ttsResponse.ok) {
                const responseData = await ttsResponse.json();
                const { url, subtitles } = responseData;
                
                const duration = await getAudioDuration(url);
                
                if (duration > 0) {
                  updatedScenes[i] = {
                    ...scene,
                    audioUrl: url,
                    subtitles,
                    durationSec: Math.max(3, Math.round((duration + 0.5) * 10) / 10), // Padding 0.5s
                  };
                  success = true;
                }
              } else {
                console.error(`TTS Error (Status: ${ttsResponse.status}). Retrying...`);
                retries--;
                await sleep(3000);
              }
            } catch (err) {
              console.error("TTS Error for scene", i, err);
              retries--;
              await sleep(3000);
            }
          }
        }
        totalFrames += Math.round(updatedScenes[i].durationSec * generatedSpec.fps);
      }

      const finalSpec = {
        ...generatedSpec,
        scenes: updatedScenes,
        durationInFrames: Math.min(5400, Math.max(90, totalFrames)),
      };

      setVideoSpec(finalSpec);
      setEditableJson(buildJsonSample(finalSpec));
      setHasGenerated(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Đã hoàn tất video (${finalSpec.templateId}) kèm giọng đọc: ${finalSpec.title}`,
        },
      ]);
      setTab("preview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Tạo thất bại. Kiểm tra GEMINI_API_KEY trong .env.local và thử lại.",
        },
      ]);
    } finally {
      setIsGenerating(false);
      setStreamStatus("Dang cho...");
    }
  };

  const handleRender = async () => {
    if (!videoSpec) return;
    
    setIsRendering(true);
    setErrorMessage(null);
    setRenderUrl(null);
    
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoSpec }),
      });
      
      const data = await response.json();
      if (data.url) {
        setRenderUrl(data.url);
      } else {
        setErrorMessage(data.error || "Render thất bại.");
      }
    } catch (error) {
      console.error("Render error:", error);
      setErrorMessage("Lỗi kết nối khi render video.");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-sans antialiased overflow-hidden selection:bg-blue-100">
      <div className="flex w-full max-w-[360px] shrink-0 flex-col border-r border-gray-200 bg-[#FAFAFA] relative z-10">
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 font-medium text-[13px] text-gray-800">
            <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-black text-white">
              <Video size={12} />
            </div>
            Video Studio
          </div>
          <button className="text-gray-400 hover:text-gray-900 transition-colors">
            <Settings size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 text-[13px] text-gray-500">
              Nhập prompt đầu tiên để Gemini tạo video. Ví dụ: "Tạo video dọc 9:16, 10 giây, giới thiệu app học tiếng Anh, tông xanh."
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className="group flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-800 font-medium text-[13px]">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      message.role === "user"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-black text-white"
                    }`}
                  >
                    {message.role === "user" ? "U" : <Wand2 size={12} />}
                  </div>
                  <span>{message.role === "user" ? "Bạn" : "Video Architect"}</span>
                </div>
                <div className="pl-7 text-[14px] text-gray-700 leading-relaxed">
                  {message.text}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 p-4 bg-gradient-to-t from-[#FAFAFA] to-transparent">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleGenerate();
            }}
            className="relative flex flex-col rounded-[16px] border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-gray-400 focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all"
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập yêu cầu mới..."
              className="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent px-4 py-3 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="text-[11px] text-gray-400">
                {selectedTemplateOption
                  ? `Template: ${selectedTemplateOption.label}`
                  : "Gemini API (auto template)"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-gray-200 px-2.5 text-[11px] font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                >
                  <Plus size={13} />
                  Template
                </button>
                <div className="relative group">
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-full h-8 pl-8 pr-3 text-[11px] font-medium text-gray-600 outline-none hover:border-gray-300 focus:border-black transition-all cursor-pointer"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
                    <Mic size={12} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || isGenerating}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isGenerating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CornerDownLeft size={14} />
                  )}
                </button>
              </div>
            </div>
          </form>
          {errorMessage ? (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {errorMessage}
            </div>
          ) : null}
          <div className="mt-3 text-center text-[11px] text-gray-400 font-medium">
            Mô hình AI có thể mắc lỗi.
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 bg-white relative">
        <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/50">
            <button
              onClick={() => setTab("preview")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium transition-all ${
                tab === "preview"
                  ? "bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Play size={14} className={tab === "preview" ? "text-gray-900" : ""} /> Preview
            </button>
            <button
              onClick={() => setTab("code")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium transition-all ${
                tab === "code"
                  ? "bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Code2 size={14} className={tab === "code" ? "text-gray-900" : ""} /> Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            {tab === "code" && (
              <>
                <button
                  onClick={handleApplyJson}
                  className="rounded-md bg-black px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
                >
                  Apply
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </>
            )}
            
            {hasGenerated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRender}
                  disabled={isRendering}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isRendering ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                  {isRendering ? "Đang Render..." : renderUrl ? "Render Lại" : "Render MP4"}
                </button>
                
                {renderUrl && (
                  <a
                    href={renderUrl}
                    download
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-green-700 animate-in fade-in zoom-in duration-300"
                  >
                    <Copy size={14} /> Tải Video
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-white">
          {tab === "code" ? (
            <div className="absolute inset-0 p-4">
              <textarea
                value={editableJson}
                onChange={(event) => setEditableJson(event.target.value)}
                className="h-full w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-[13px] leading-[1.55] text-gray-800 outline-none focus:border-gray-400"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#F9F9F9] overflow-y-auto p-8">
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              />
              {hasGenerated ? (
                <div className="relative w-full max-w-[360px] bg-white border border-gray-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
                  <Player
                    acknowledgeRemotionLicense
                    component={PreviewComponent}
                    durationInFrames={videoSpec.durationInFrames}
                    fps={videoSpec.fps}
                    compositionWidth={videoSpec.width}
                    compositionHeight={videoSpec.height}
                    controls
                    autoPlay
                    loop
                    style={{
                      width: "100%",
                      aspectRatio: `${videoSpec.width} / ${videoSpec.height}`,
                    }}
                    inputProps={{
                      title: videoSpec.title,
                      subtitle: videoSpec.subtitle,
                      accent: videoSpec.accent,
                      cta: videoSpec.cta,
                      scenes: videoSpec.scenes,
                      backgroundImage: videoSpec.backgroundImage,
                      icon: videoSpec.icon,
                      animationType: videoSpec.animationType,
                      backgroundColor: videoSpec.backgroundColor,
                      showGrid: videoSpec.showGrid,
                      showGradient: videoSpec.showGradient,
                      stats: videoSpec.stats,
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-[13px] text-gray-500">
                  Chưa có preview. Gửi prompt để bắt đầu.
                </div>
              )}
            </div>
          )}

          {isGenerating ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] text-gray-700 shadow-sm">
                <Loader2 size={14} className="animate-spin" />
                {streamStatus}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isTemplateModalOpen ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-[14px] font-semibold text-gray-900">Chọn template</h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate("auto");
                  setIsTemplateModalOpen(false);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedTemplate === "auto"
                    ? "border-black bg-black/[0.03]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-[12px] font-semibold text-gray-900">Auto (Gemini)</div>
                <div className="text-[11px] text-gray-500">Để Gemini tự chọn template theo nội dung.</div>
              </button>
              {TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(option.id);
                    setIsTemplateModalOpen(false);
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    selectedTemplate === option.id
                      ? "border-black bg-black/[0.03]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-gray-900">{option.label}</span>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                      {option.id}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">{option.description}</div>
                </button>
              ))}
              <button
                onClick={handleRender}
                disabled={isGenerating || isRendering || !hasGenerated}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang Render...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Render MP4
                  </>
                )}
              </button>

              {renderUrl && (
                <a
                  href={renderUrl}
                  download
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/20"
                >
                  <Copy className="w-5 h-5" />
                  Tải Video
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
