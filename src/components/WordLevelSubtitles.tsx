import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

type WordTimestamp = {
  offset: number; // in ticks (100ns)
  duration: number; // in ticks
  text: string;
};

type WordLevelSubtitlesProps = {
  subtitles: WordTimestamp[];
  accentColor: string;
  localFrame: number; // Current frame relative to the start of the scene
};

export const WordLevelSubtitles: React.FC<WordLevelSubtitlesProps> = ({
  subtitles,
  accentColor,
  localFrame,
}) => {
  const { fps } = useVideoConfig();

  // Convert localFrame to seconds to match subtitles' timing
  const currentTimeSec = localFrame / fps;

  // Tìm từ hiện tại đang được đọc
  let currentWordIndex = subtitles.findIndex((w) => {
    const start = w.offset / 10000000;
    const end = (w.offset + w.duration) / 10000000;
    return currentTimeSec >= start && currentTimeSec <= end;
  });

  // Nếu đang ở khoảng lặng giữa các từ, giữ nguyên từ vừa đọc xong
  if (currentWordIndex === -1) {
    // Note: JS doesn't have findLastIndex in older versions, so we use a loop or reduce
    for (let i = subtitles.length - 1; i >= 0; i--) {
      if (subtitles[i].offset / 10000000 <= currentTimeSec) {
        currentWordIndex = i;
        break;
      }
    }
  }
  if (currentWordIndex === -1) currentWordIndex = 0;

  // Cắt thành các cụm 5 từ (chunk) để không bị nhảy chữ liên tục
  const chunkSize = 5;
  const chunkIndex = Math.floor(currentWordIndex / chunkSize);
  const chunkToDisplay = subtitles.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 80, // Space from bottom
        pointerEvents: "none", // Ensure it doesn't block interactions
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: 900,
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "12px 16px",
          padding: "20px",
          textShadow: "0 4px 20px rgba(0,0,0,0.8)",
        }}
      >
        {chunkToDisplay?.map((word, i) => {
          // Convert ticks to seconds (1 tick = 100ns)
          const startSec = word.offset / 10000000;
          const durationSec = word.duration / 10000000;
          const endSec = startSec + durationSec;

          // Check if the current frame is within the word's active window
          const isActive = currentTimeSec >= startSec && currentTimeSec < endSec;
          const isPassed = currentTimeSec >= endSec;

          return (
            <span
              key={i}
              style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                color: isActive ? accentColor : isPassed ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                textTransform: "uppercase",
                transition: "all 0.1s ease-out",
                transform: isActive ? "scale(1.15) translateY(-4px)" : "scale(1)",
                textShadow: isActive 
                  ? `0 0 20px ${accentColor}, 0 4px 10px rgba(0,0,0,0.8)` 
                  : "0 4px 10px rgba(0,0,0,0.8)",
                WebkitTextStroke: isActive ? "none" : "1px rgba(0,0,0,0.5)",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
