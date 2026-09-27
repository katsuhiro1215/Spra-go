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

/** 管理画面(ショップ編集)の絵の選択肢に出す名前。2×2の絵は大きさも書く */
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
  fountain: "噴水(2×2)",
  palm: "ヤシの木",
  parasol: "ビーチパラソル",
  pagoda: "五重塔(2×2)",
  castle: "お城(2×2)",
  tower: "タワー(2×2)",
  boat_small: "小さな船",
  boat_large: "大きな船(2×2)",
};

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
