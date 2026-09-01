// 3B1B-style semantic palette (see SKILL.md "3Blue1Brown 风格指南").
// Colors carry meaning -- reuse these tokens rather than picking new hex
// values per scene, so "blue = input/positive" stays consistent site-wide.
export const COLORS = {
  background: "#0b0b14",
  positive: "#58C4DD",
  negative: "#FF6B6B",
  highlight: "#FFD84D",
  result: "#83C167",
  text: "#FFFFFF",
  neutral: "#5b5b70",
  dim: "rgba(255,255,255,0.25)",
  accent: "#FF8C00",
} as const;

export const FONT_STACK =
  '"Be Vietnam Pro", "Inter", "Noto Sans", system-ui, -apple-system, sans-serif';
