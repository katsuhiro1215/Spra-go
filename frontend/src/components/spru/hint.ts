import type { ShopListItem, WorldItem } from "@/components/world/types";

/** スプルをタップしたときのひとこと。上から順に最初に当てはまるもの(設計書5-2) */
export function pickTownHint({
  bag,
  points,
  level,
  shop,
  canWater = false,
  travelReady = null,
}: {
  bag: WorldItem[];
  points: number;
  level: number;
  shop: ShopListItem[];
  canWater?: boolean;
  travelReady?: { key: string; name: string } | null;
}): string {
  if (canWater) return "畑に水をあげよう！";
  if (travelReady) return `旅のじゅんびがそろったよ！『旅する』から${travelReady.name}へ出発しよう`;
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
