import { CATEGORY_LABELS, type ItemCategory } from "./categories";

/** 町のアイテムの絵のキー。config/world.php の asset_keys と必ず一致させる(art-keys.test.ts で確かめる) */
export const ITEM_ART_KEYS = [
  "bench",
  "flowerbed",
  "chochin",
  "tree",
  "sakura",
  "vending",
  "bicycle",
  "stall",
  "stone_lantern",
  "bamboo",
  "fountain",
  "palm",
  "parasol",
  "pagoda",
  "castle",
  "tower",
  "boat_small",
  "boat_large",
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];

/** おみやげの絵のキー。config/travel.php のおみやげのキーと必ず一致させる。ショップでは売らないので asset_keys には入れない */
export const SOUVENIR_ART_KEYS = [
  "komodo",
  "borobudur",
  "dol_hareubang",
  "bulguksa",
  "bison",
  "liberty",
  "phone_box",
  "stonehenge",
  "eiffel",
  "mont_saint_michel",
] as const;

export type SouvenirArtKey = (typeof SOUVENIR_ART_KEYS)[number];

export type ArtKey = ItemArtKey | SouvenirArtKey;

/** 管理画面(ショップ編集)の絵の選択肢に出す名前。カテゴリと大きさは artOptionLabel で添える */
export const ITEM_ART_LABELS: Record<ItemArtKey, string> = {
  bench: "ベンチ",
  flowerbed: "花だん",
  chochin: "ちょうちん",
  tree: "木",
  sakura: "桜の木",
  vending: "自動販売機",
  bicycle: "自転車",
  stall: "屋台",
  stone_lantern: "石灯籠",
  bamboo: "竹",
  fountain: "噴水",
  palm: "ヤシの木",
  parasol: "ビーチパラソル",
  pagoda: "五重塔",
  castle: "お城",
  tower: "タワー",
  boat_small: "小さな船",
  boat_large: "大きな船",
};

/** 絵のカテゴリ(設計書 2026-09-28-town-items 3-2)。config/world.php の asset_categories と必ず一致させる */
export const ITEM_ART_CATEGORIES: Record<ItemArtKey, ItemCategory> = {
  bench: "decor",
  flowerbed: "nature",
  chochin: "decor",
  tree: "nature",
  sakura: "nature",
  vending: "decor",
  bicycle: "vehicle",
  stall: "house",
  stone_lantern: "decor",
  bamboo: "nature",
  fountain: "decor",
  palm: "nature",
  parasol: "decor",
  pagoda: "landmark",
  castle: "landmark",
  tower: "landmark",
  boat_small: "vehicle",
  boat_large: "vehicle",
};

/** 管理画面の絵の選択肢の名前。カテゴリと、2×2なら大きさを添える(例: 「五重塔（名所・2×2）」) */
export function artOptionLabel(key: ItemArtKey): string {
  const size = isBigAsset(key) ? "・2×2" : "";
  return `${ITEM_ART_LABELS[key]}（${CATEGORY_LABELS[ITEM_ART_CATEGORIES[key]]}${size}）`;
}

/** 2×2マスの絵(設計書3-4)。config/world.php の asset_footprints と必ず一致させる */
export const BIG_ASSETS: readonly ArtKey[] = [
  "fountain",
  "pagoda",
  "castle",
  "tower",
  "boat_large",
  "borobudur",
  "bulguksa",
  "liberty",
  "stonehenge",
  "mont_saint_michel",
];

export function isBigAsset(key: string | null): boolean {
  return key !== null && (BIG_ASSETS as readonly string[]).includes(key);
}
