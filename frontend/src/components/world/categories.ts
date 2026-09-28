/** 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3章)。並びはタブの順 */
export const ITEM_CATEGORIES = ["nature", "decor", "house", "landmark", "vehicle", "souvenir"] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  nature: "しぜん",
  decor: "かざり",
  house: "いえ・お店",
  landmark: "名所",
  vehicle: "のりもの",
  souvenir: "おみやげ",
};

type Categorized = { category: ItemCategory | null };

/** 品が1つ以上あるカテゴリだけを、決まった順に返す(ショップのタブ。おみやげは売らないので出ない) */
export function presentCategories(items: readonly Categorized[]): ItemCategory[] {
  return ITEM_CATEGORIES.filter((category) => items.some((item) => item.category === category));
}

export type BagTab = "all" | ItemCategory;

/** バッグのタブ: 「すべて」のあとに、品のあるカテゴリ */
export function bagTabs(items: readonly Categorized[]): BagTab[] {
  return ["all", ...presentCategories(items)];
}

export function tabLabel(tab: BagTab): string {
  return tab === "all" ? "すべて" : CATEGORY_LABELS[tab];
}

/** 選んでいたタブがなくなったら(品が減ったときなど)、またはまだ選んでいなければ、最初のタブにする */
export function pickTab<T extends string>(tabs: readonly T[], selected: T | null): T | null {
  return selected !== null && tabs.includes(selected) ? selected : (tabs[0] ?? null);
}

export function inTab<T extends Categorized>(items: readonly T[], tab: BagTab): T[] {
  return tab === "all" ? [...items] : items.filter((item) => item.category === tab);
}

/** レベルが上がって、今のレベルで買えるようになった物(鍵がなく、必要レベルが今のレベルと同じ。Lv1の物は除く) */
export function isNewItem(item: { min_level: number; locked: boolean }, level: number): boolean {
  return !item.locked && item.min_level > 1 && item.min_level === level;
}

/** NEW の物があるカテゴリ(タブに印を付ける) */
export function categoriesWithNew(
  items: readonly (Categorized & { min_level: number; locked: boolean })[],
  level: number,
): ItemCategory[] {
  return presentCategories(items.filter((item) => isNewItem(item, level)));
}
