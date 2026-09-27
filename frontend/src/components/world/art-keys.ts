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
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];

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
};

/** 2×2マスの絵(設計書3-4)。config/world.php の asset_footprints と必ず一致させる */
export const BIG_ASSETS: readonly ItemArtKey[] = ["fountain", "pagoda", "castle", "tower"];

export function isBigAsset(key: string | null): boolean {
  return key !== null && (BIG_ASSETS as readonly string[]).includes(key);
}
