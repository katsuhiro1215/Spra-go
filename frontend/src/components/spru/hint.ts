import type { ShopListItem, WorldItem } from "@/components/world/types";

/** スプルをタップしたときのひとこと。上から順に最初に当てはまるもの(設計書5-2) */
export function pickTownHint({
  bag,
  points,
  level,
  shop,
}: {
  bag: WorldItem[];
  points: number;
  level: number;
  shop: ShopListItem[];
}): string {
  if (bag.length > 0) return `バッグに${bag[0].name}があるよ。町に置いてみよう`;

  const decorations = shop.filter((item) => item.type === "decoration");
  const unlocked = decorations.filter((item) => item.min_level <= level).sort((a, b) => a.price - b.price);
  const affordable = unlocked.find((item) => item.price <= points);
  if (affordable) return `${affordable.name}が買えるよ！ショップをのぞいてみよう`;
  if (unlocked.length > 0) return `あと${unlocked[0].price - points}ptで${unlocked[0].name}が買えるよ`;

  const nextLocked = decorations
    .filter((item) => item.min_level > level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  if (nextLocked) return `Lv.${nextLocked.min_level}で${nextLocked.name}が買えるようになるよ`;

  return "つづきから学ぼう！";
}
