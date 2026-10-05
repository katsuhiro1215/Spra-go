import { SPRU_ITEMS, type SpruImage } from "@/components/spru/spru-assets";

/** パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md) */
export type ZukanKind = "bread" | "crop";

/** ずかんの1つ。持っていない物は、名前・英語・日付が null(もらうまで出さない) */
export type ZukanItem = {
  key: string;
  kind: ZukanKind;
  owned: boolean;
  name: string | null;
  english: string | null;
  received_at: string | null;
};

export type ZukanData = { items: ZukanItem[]; owned_count: number; total: number };

/** おつかいの3つ目を受け取ったときに贈られた物 */
export type ZukanGift = { key: string; name: string; english: string; kind: ZukanKind };

/** 集めた数の表示(例: 「3 / 15」) */
export function zukanProgress(owned: number, total: number): string {
  return `${owned} / ${total}`;
}

/** 全部そろったか(0個の一覧は、そろったとは言わない) */
export function isZukanComplete(owned: number, total: number): boolean {
  return total > 0 && owned >= total;
}

/** ずかんの物の絵。SPRU_ITEMS の `zukan_{キー}`。絵がなければ null */
export function zukanImage(
  key: string,
  images: Record<string, SpruImage | undefined> = SPRU_ITEMS as Record<string, SpruImage | undefined>,
): SpruImage | null {
  return images[`zukan_${key}`] ?? null;
}
