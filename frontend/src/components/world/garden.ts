import type { SpruImageKey } from "@/components/spru/spru-assets";

import type { NewSeed, WorldGarden } from "./types";

export type GardenTap =
  | { action: "sow" }
  | { action: "choose" }
  | { action: "water" }
  | { action: "say"; image: SpruImageKey; line: string };

/**
 * スプルの種をまける(畑が空いていて、スプルの種ができている)。町のスプルのタップとふだんのひとことはこれを見る
 * (特別な種だけのときに、スプルの花の話をしないため。docs/design/2026-09-29-rare-spru-design.md 5-4)
 */
export function canSowSpruSeed(garden: WorldGarden): boolean {
  return garden.state === "empty" && garden.spru_seed_ready;
}

/** 畑をタップしたときの動き(B回の設計書3-4)。ふくろに種があれば、どの種をまくかを選ぶ(レアスプルの設計書3-3) */
export function pickGardenTap(garden: WorldGarden): GardenTap {
  if (garden.state === "empty") {
    if (garden.seed_bag.length > 0) return { action: "choose" };
    return garden.spru_seed_ready
      ? { action: "sow" }
      : { action: "say", image: "think", line: "レベルが上がると、スプルに花が咲くよ" };
  }
  if (garden.can_water) return { action: "water" };
  if (!garden.learned_today) return { action: "say", image: "think", line: "今日1問正解したら、水をあげられるよ" };
  return { action: "say", image: "smile", line: "今日はもう水をあげたよ。また明日ね" };
}

/** スプルのふだんのひとことより優先する、畑の案内(B回の設計書3-4、レアスプルの設計書5-4) */
export function gardenPrompt(garden: WorldGarden): string | null {
  if (canSowSpruSeed(garden)) return "花が咲いたよ！タップして種をまこう";
  if (garden.state === "empty" && garden.seed_bag.length > 0) return "特別な種を畑にまいてみよう！";
  if (garden.can_water) return "芽に水をあげよう！";
  return null;
}

export type SeedOption = { seed: string; label: string; note: string | null; look: string };

/** どの種をまく？の並び(レアスプルの設計書5-3)。スプルの種(できているときだけ)→ふくろの種 */
export function seedOptions(garden: WorldGarden): SeedOption[] {
  const spru: SeedOption[] = garden.spru_seed_ready
    ? [{ seed: "spru", label: "スプルの種", note: "なにが生まれるかな？", look: "spru" }]
    : [];
  return [...spru, ...garden.seed_bag.map((item) => ({ seed: item.key, label: seedLabel(item.name), note: null, look: item.key }))];
}

/**
 * 種をもらったお祝いに出す種を足す(置き換えない)。町を続けて読み直したとき、あとの空の返事で
 * まだ見せていないお祝いを消さないため(docs/design/2026-09-29-rare-spru-design.md 5-2)
 */
export function mergeNewSeeds(shown: NewSeed[], incoming: NewSeed[]): NewSeed[] {
  return [...shown, ...incoming.filter((seed) => !shown.some((s) => s.key === seed.key))];
}

/** 「ルビースプル」→「ルビーの種」 */
export function seedLabel(name: string): string {
  return `${name.replace(/スプル$/, "")}の種`;
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
