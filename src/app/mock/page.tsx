"use client";

import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { ShortVideoTemplate } from "@/template/ShareNews";
import { shortVideoMockPresets } from "@/template/mock-short-video";
import { TemplateTechnical } from "@/template/TemplateTechnical";


export default function MockPreviewPage() {
  const [selectedId, setSelectedId] = useState(shortVideoMockPresets[0].id);

  const selected = useMemo(
    () =>
      shortVideoMockPresets.find((preset) => preset.id === selectedId) ??
      shortVideoMockPresets[0],
    [selectedId],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Mock Preview Short Video
          </h1>
          <p className="text-sm text-slate-400 md:text-base">
            Trang demo khong goi API. Dung de xem template TikTok/short video voi du lieu mock.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              Presets
            </p>
            <div className="space-y-2">
              {shortVideoMockPresets.map((preset) => {
                const active = preset.id === selected.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedId(preset.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/90 p-3">
              <p className="text-xs text-slate-400">Timeline</p>
              <p className="mt-1 text-sm text-slate-200">
                {selected.spec.scenes.length} scenes • {selected.spec.durationInFrames} frames
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {selected.spec.width}x{selected.spec.height} • {selected.spec.fps} fps
              </p>
            </div>
          </aside>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl shadow-slate-950/50">
              <Player
                acknowledgeRemotionLicense
                component={TemplateTechnical}
                durationInFrames={selected.spec.durationInFrames}
                fps={selected.spec.fps}
                compositionWidth={selected.spec.width}
                compositionHeight={selected.spec.height}
                controls
                autoPlay
                loop
                style={{
                  width: "100%",
                  aspectRatio: `${selected.spec.width} / ${selected.spec.height}`,
                }}
                // inputProps={{
                //   title: selected.spec.title,
                //   subtitle: selected.spec.subtitle,
                //   accent: selected.spec.accent,
                //   cta: selected.spec.cta,
                //   scenes: selected.spec.scenes,
                //   backgroundImage: selected.spec.backgroundImage,
                //   icon: selected.spec.icon,
                //   animationType: selected.spec.animationType,
                //   backgroundColor: selected.spec.backgroundColor,
                //   showGrid: selected.spec.showGrid,
                //   showGradient: selected.spec.showGradient,
                //   stats: selected.spec.stats,
                // }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
