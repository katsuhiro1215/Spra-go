import type { SpruImageKey } from "@/components/spru/spru-assets";

import type { WorldGarden } from "./types";

export type GardenTap = { action: "sow" } | { action: "water" } | { action: "say"; image: SpruImageKey; line: string };

/** 畑をタップしたときの動き(設計書3-4) */
export function pickGardenTap(garden: WorldGarden): GardenTap {
  if (garden.state === "empty") {
    return garden.can_sow
      ? { action: "sow" }
      : { action: "say", image: "think", line: "レベルが上がると、スプルに花が咲くよ" };
  }
  if (garden.can_water) return { action: "water" };
  if (!garden.learned_today) return { action: "say", image: "think", line: "今日1問正解したら、水をあげられるよ" };
  return { action: "say", image: "smile", line: "今日はもう水をあげたよ。また明日ね" };
}

/** スプルのふだんのひとことより優先する、畑の案内(設計書3-4) */
export function gardenPrompt(garden: WorldGarden): string | null {
  if (garden.can_sow) return "花が咲いたよ！タップして種をまこう";
  if (garden.can_water) return "芽に水をあげよう！";
  return null;
}

const NEXT_GROWTH = ["つぼみ", "花", "種"] as const;

/** 町の上のバーの右側(設計書5-5) */
export function growthLabel(growth: number, xp: number, levelXp: { floor: number; next: number }): string {
  if (growth >= 3) return "種ができた！";
  return `${NEXT_GROWTH[growth]}まで あと${Math.max(0, levelXp.next - xp)}XP`;
}

/** レベルアップのお祝いに足すひとこと(設計書3-1) */
export function levelUpGrowthLine(growth: number, gardenBusy: boolean): string | null {
  if (growth === 1) return "スプルにつぼみがついた！";
  if (growth === 2) return "スプルの花が咲いた！";
  if (growth >= 3) return gardenBusy ? "畑の芽が育ったら、種をまけるよ" : "種ができた！町でまいてみよう";
  return null;
}
