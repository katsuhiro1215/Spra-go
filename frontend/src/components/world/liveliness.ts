import type { WorldItem } from "./types";

/** にぎやか度の段階(設計書3-2)。E回で土地が広がったら見直す */
export const LIVELINESS_LEVELS = [
  { need: 0, label: "しずか" },
  { need: 6, label: "すこしにぎやか" },
  { need: 15, label: "にぎやか" },
  { need: 27, label: "とってもにぎやか" },
  { need: 42, label: "おまつり" },
] as const;

export const LIVELINESS_HINTS = ["ちがう種類のアイテムを置くと、ぐんとにぎやかになるよ", "仲間が増えても、にぎやかになるよ"];

const FIRST_OF_KIND = 3;
const SAME_KIND = 1;
const PER_COMPANION = 3;

export type Liveliness = { score: number; level: number; label: string; next: { label: string; remaining: number } | null };

/** 置いたアイテムは種類ごとに1つ目+3・2つ目から+1、仲間は1人+3。バッグのアイテムは数えない */
export function livelinessScore(items: Pick<WorldItem, "shop_item_id" | "x" | "y">[], companionCount: number): number {
  const perKind = new Map<number, number>();
  for (const item of items) {
    if (item.x === null || item.y === null) continue;
    perKind.set(item.shop_item_id, (perKind.get(item.shop_item_id) ?? 0) + 1);
  }
  let score = companionCount * PER_COMPANION;
  for (const count of perKind.values()) score += FIRST_OF_KIND + (count - 1) * SAME_KIND;
  return score;
}

export function levelForScore(score: number): Liveliness {
  let index = 0;
  LIVELINESS_LEVELS.forEach((level, i) => {
    if (score >= level.need) index = i;
  });
  const next = LIVELINESS_LEVELS[index + 1];
  return {
    score,
    level: index + 1,
    label: LIVELINESS_LEVELS[index].label,
    next: next ? { label: next.label, remaining: next.need - score } : null,
  };
}

export function liveliness(items: Pick<WorldItem, "shop_item_id" | "x" | "y">[], companionCount: number): Liveliness {
  return levelForScore(livelinessScore(items, companionCount));
}

export function livelinessStars(level: number): string {
  const filled = Math.max(1, Math.min(5, level));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export function livelinessNextText(lively: Liveliness): string {
  return lively.next ? `${lively.next.label}まで あと${lively.next.remaining}` : "町はおまつり！";
}

/** 段階が上がったときのスプルのひとこと(設計書3-2) */
export function livelinessUpLine(label: string): string {
  return `町がにぎやかになったね！『${label}』になったよ`;
}
