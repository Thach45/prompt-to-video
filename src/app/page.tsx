import React from "react";
import {
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 antialiased font-sans">
      <main>
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 sm:pt-20 sm:pb-32 overflow-hidden">
          {/* Background Ambient Effects */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div
              className="absolute -left-[10%] top-0 h-[600px] w-[80%] md:w-[60%] rounded-full bg-violet-600/[0.08] blur-[120px]"
              aria-hidden="true"
            />
            <div
              className="absolute -right-[10%] top-[20%] h-[500px] w-[70%] md:w-[50%] rounded-full bg-amber-500/[0.08] blur-[120px]"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"
              aria-hidden="true"
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-12 lg:gap-8 min-h-[75vh]">
              
              {/* Left Column: Typography & CTAs */}
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium text-violet-700 shadow-sm backdrop-blur-md mb-6 sm:mb-8">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                  <span>Prompt → Spec → Preview chuẩn 9:16</span>
                </div>
                
                <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[4rem] lg:leading-[1.1] text-zinc-900">
                  Biến lời nhắc thành
                  <span className="block mt-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent pb-2">
                    video dọc có cấu trúc
                  </span>
                </h1>
                
                <p className="mt-5 sm:mt-6 text-base sm:text-lg leading-relaxed text-zinc-600 max-w-xl">
                  Gemini tạo kịch bản theo từng scene. Bạn chọn template, sửa JSON nếu cần, và xem ngay kết quả với Remotion — không cần chuyển đổi môi trường.
                </p>
                
                <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
                  <a
                    href="/studio"
                    className="group inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-zinc-900 px-5 py-3 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-xl shadow-zinc-900/20 ring-1 ring-zinc-900/10 transition-all hover:bg-zinc-800 hover:shadow-zinc-900/30 active:scale-95"
                  >
                    Bắt đầu trong Studio
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  <a
                    href="/mock"
                    className="inline-flex items-center gap-2 rounded-xl sm:rounded-2xl border border-zinc-200 bg-white/50 backdrop-blur-sm px-5 py-3 sm:px-6 sm:py-3.5 text-sm sm:text-base font-medium text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-white active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-zinc-400 text-zinc-400 transition-colors group-hover:fill-zinc-600 group-hover:text-zinc-600" />
                    Xem mock templates
                  </a>
                </div>
              </div>

              {/* Right Column: Product Preview Showcase */}
              <div className="relative mx-auto w-full max-w-lg lg:max-w-none mt-8 lg:mt-0">
                {/* Decorative glows behind mockup */}
                <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-tr from-violet-500/20 via-fuchsia-500/20 to-amber-500/20 blur-2xl"></div>
                
                <div className="relative rounded-[20px] sm:rounded-[24px] border border-zinc-200/80 bg-white/40 p-1.5 sm:p-2 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl">
                  <div className="overflow-hidden rounded-[14px] sm:rounded-[16px] bg-zinc-950 ring-1 ring-zinc-900/50">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-md">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] font-medium tracking-wide text-zinc-500">
                        studio / remotion-player
                      </div>
                      <div className="w-10 sm:w-12"></div> {/* Spacer for center alignment */}
                    </div>

                    {/* Split View - FIXED LAYOUT FOR MOBILE */}
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-h-[280px] sm:min-h-[380px]">
                      
                      {/* Code Editor Side */}
                      <div className="border-r border-zinc-800/80 bg-[#0D0D11] p-3 sm:p-5 flex flex-col overflow-hidden">
                        <div className="mb-3 sm:mb-4 flex items-center gap-2">
                          <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 sm:px-2 sm:py-1 font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/20">
                            JSON Spec
                          </span>
                        </div>
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                          <pre className="font-mono text-[10px] sm:text-[12px] leading-loose text-zinc-300 pb-2 pr-2">
                            <span className="text-zinc-500">{"{"}</span>
                            <br />
                            {"  "}<span className="text-blue-400">"templateId"</span>: <span className="text-amber-300">"cyber-tech"</span>,
                            <br />
                            {"  "}<span className="text-blue-400">"scenes"</span>: <span className="text-zinc-500">{"["}</span>
                            <br />
                            {"    "}<span className="text-zinc-500">{"{"}</span>
                            <br />
                            {"      "}<span className="text-blue-400">"layout"</span>: <span className="text-amber-300">"intro"</span>,
                            <br />
                            {"      "}<span className="text-blue-400">"title"</span>: <span className="text-green-400">"Kỷ Nguyên AI"</span>
                            <br />
                            {"    "}<span className="text-zinc-500">{"}"}</span>
                            <br />
                            {"  "}<span className="text-zinc-500">{"]"}</span>
                            <br />
                            <span className="text-zinc-500">{"}"}</span>
                          </pre>
                        </div>
                      </div>

                      {/* Phone Preview Side */}
                      <div className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#18181b,#09090b)] p-3 sm:p-6 overflow-hidden">
                        {/* Subtle background grid in preview */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                        
                        <div className="relative z-10 aspect-[9/16] w-[85%] sm:w-[65%] max-w-[180px] overflow-hidden rounded-[16px] sm:rounded-[24px] border-[4px] sm:border-[6px] border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/10">
                          {/* Notch */}
                          <div className="absolute top-0 left-1/2 h-3 sm:h-4 w-1/2 -translate-x-1/2 rounded-b-lg sm:rounded-b-xl bg-zinc-800"></div>
                          
                          {/* Video Content Fake */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-violet-900/40 via-zinc-900 to-zinc-950 p-2 sm:p-4">
                            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-violet-400 mb-2 sm:mb-3 animate-pulse" />
                            <p className="text-center font-sans text-[11px] sm:text-sm font-bold tracking-tight text-white">
                              KỶ NGUYÊN AI
                            </p>
                            
                            {/* Scrubber */}
                            <div className="absolute bottom-3 sm:bottom-4 left-3 right-3 flex items-center gap-1.5 sm:gap-2">
                              <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="white" />
                              <div className="h-1 flex-1 rounded-full bg-white/20">
                                <div className="h-full w-1/3 rounded-full bg-violet-500"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 rounded bg-black/40 px-1.5 py-0.5 sm:px-2 sm:py-1 font-mono text-[8px] sm:text-[9px] text-zinc-500 backdrop-blur-md">
                          Live Render
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </section>
      </main>
      
      {/* Thêm CSS ẩn scrollbar để phần code trông đẹp hơn trên mobile */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}