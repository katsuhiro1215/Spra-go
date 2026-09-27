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

/** 2×2マスの絵(設計書3-4)。config/world.php の asset_footprints と必ず一致させる */
export const BIG_ASSETS: readonly ItemArtKey[] = ["fountain", "pagoda", "castle", "tower"];

export function isBigAsset(key: string | null): boolean {
  return key !== null && (BIG_ASSETS as readonly string[]).includes(key);
}
