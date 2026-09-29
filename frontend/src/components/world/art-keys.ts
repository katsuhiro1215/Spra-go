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
  // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)
  "tulip",
  "rock",
  "sunflower",
  "bush",
  "momiji",
  "pine",
  "flower_pots",
  "well",
  "street_lamp",
  "mailbox",
  "cottage",
  "red_house",
  "bakery",
  "japanese_house",
  "cafe",
  "lighthouse",
  // 特別の名所(docs/design/2026-09-28-town-items-design.md 5-4)
  "kinkakuji",
  "sungnyemun",
  "arc_de_triomphe",
  "big_ben",
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
  tulip: "チューリップ",
  rock: "岩と草",
  sunflower: "ひまわり",
  bush: "まるい植え込み",
  momiji: "もみじ",
  pine: "松",
  flower_pots: "植木鉢",
  well: "井戸",
  street_lamp: "街灯",
  mailbox: "ポスト",
  cottage: "小さな家",
  red_house: "赤い屋根の家",
  bakery: "パン屋",
  japanese_house: "和風の家",
  cafe: "カフェ",
  lighthouse: "灯台",
  kinkakuji: "金閣寺",
  sungnyemun: "南大門",
  arc_de_triomphe: "凱旋門",
  big_ben: "ビッグ・ベン",
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
  tulip: "nature",
  rock: "nature",
  sunflower: "nature",
  bush: "nature",
  momiji: "nature",
  pine: "nature",
  flower_pots: "decor",
  well: "decor",
  street_lamp: "decor",
  mailbox: "decor",
  cottage: "house",
  red_house: "house",
  bakery: "house",
  japanese_house: "house",
  cafe: "house",
  lighthouse: "landmark",
  kinkakuji: "landmark",
  sungnyemun: "landmark",
  arc_de_triomphe: "landmark",
  big_ben: "landmark",
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
  "bakery",
  "japanese_house",
  "cafe",
  "lighthouse",
  "kinkakuji",
  "sungnyemun",
  "arc_de_triomphe",
  "big_ben",
];

export function isBigAsset(key: string | null): boolean {
  return key !== null && (BIG_ASSETS as readonly string[]).includes(key);
}
