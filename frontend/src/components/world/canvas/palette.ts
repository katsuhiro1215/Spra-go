import type { Ground } from "../types";
import type { BlendKind } from "../blend";

// 区画の地面の色(設計書3-1)。tile は市松の2色、lip は側面の上の縁(左手前・右手前)
export const GROUND: Record<Ground, { tile: [string, string]; lip: [string, string] }> = {
  grass: { tile: ["#b4e19b", "#a9da8e"], lip: ["#86c56d", "#74b35d"] },
  bamboo: { tile: ["#94d17e", "#88c872"], lip: ["#6fae55", "#5f9e47"] },
  sand: { tile: ["#f3e2b3", "#ecd8a2"], lip: ["#e0c88c", "#d3ba7c"] },
  hill: { tile: ["#c8eda9", "#bee69d"], lip: ["#9fd684", "#8cc672"] },
  riverbank: { tile: ["#a8d98e", "#9dd283"], lip: ["#7bbb62", "#6aab53"] },
  plateau: { tile: ["#cfe58f", "#c6df84"], lip: ["#a9c96b", "#97b95c"] },
  islet: { tile: ["#f1e0a6", "#ead69a"], lip: ["#dcc27f", "#cdb26e"] },
};
export const PATH_COLOR = "#f1dfbb";
// 林・花畑の地面の絵が届くまでの色(設計書 2026-10-05-town-blend 4-2)
export const BLEND_FALLBACK: Record<BlendKind, { color: string; opacity: number }> = {
  grove: { color: "#5f9e47", opacity: 0.45 },
  meadow: { color: "#f3b7d6", opacity: 0.35 },
};
export const SOIL = { left: "#d7a574", right: "#bf8a5b" };
