import { ITEM_ART_KEYS, ITEM_ART_LABELS, type ItemArtKey } from "@/components/world/art-keys";

/** 一覧の絞り込み(Owner管理画面「アイテム管理」)。サイズは町のアイテムだけが持つ */
export type ListItem = {
  id: number;
  name: string;
  type: string;
  category: string | null;
  w: number | null;
  h: number | null;
  meta: { asset_key?: string } | null;
};

export type ListFilter = { query: string; type: string; category: string; size: string };

export const noFilter: ListFilter = { query: "", type: "all", category: "all", size: "all" };

export const SIZE_OPTIONS = [
  { value: "all", label: "すべての大きさ" },
  { value: "1x1", label: "1×1" },
  { value: "2x2", label: "2×2" },
  { value: "3x3", label: "3×3" },
  { value: "rect", label: "長方形" },
  { value: "big", label: "2以上(大きな物)" },
] as const;

export function sizeText(item: Pick<ListItem, "w" | "h">): string | null {
  return item.w && item.h ? `${item.w}×${item.h}` : null;
}

function matchesSize(item: ListItem, size: string): boolean {
  if (size === "all") return true;
  if (!item.w || !item.h) return false;
  if (size === "rect") return item.w !== item.h;
  if (size === "big") return Math.max(item.w, item.h) >= 2;
  return `${item.w}x${item.h}` === size;
}

export function filterItems<T extends ListItem>(items: T[], filter: ListFilter): T[] {
  const query = filter.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.type !== "all" && item.type !== filter.type) return false;
    if (filter.category !== "all" && item.category !== filter.category) return false;
    if (!matchesSize(item, filter.size)) return false;
    if (!query) return true;
    return [item.name, item.meta?.asset_key ?? ""].some((text) => text.toLowerCase().includes(query));
  });
}

/** 絵はあるのに、どのアイテムも使っていない絵(売り忘れの目印) */
export function unusedArtKeys(items: ListItem[]): ItemArtKey[] {
  const used = new Set(items.map((item) => item.meta?.asset_key));
  return ITEM_ART_KEYS.filter((key) => !used.has(key));
}

export function artLabel(key: string | undefined): string {
  return (ITEM_ART_LABELS as Record<string, string>)[key ?? ""] ?? key ?? "";
}
