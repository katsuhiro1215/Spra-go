/** 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4) */
export type GiftCandidate = { shop_item_id: number; name: string; asset_key: string | null; footprint: number };
export type PendingGift = { level: number; candidates: GiftCandidate[] };

export function giftTitle(level: number): string {
  return `Lv.${level}のごほうび`;
}

export function giftLine(): string {
  return "すきな名所を1つ えらべるよ";
}

export function sizeLabel(footprint: number): string {
  return `${footprint}×${footprint}`;
}
