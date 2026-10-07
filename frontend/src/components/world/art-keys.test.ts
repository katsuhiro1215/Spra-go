import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ASSET_FOOTPRINTS,
  ITEM_ART_CATEGORIES,
  ITEM_ART_KEYS,
  ITEM_ART_LABELS,
  SOUVENIR_ART_KEYS,
  artOptionLabel,
  assetFootprint,
  isBigAsset,
} from "./art-keys";

// サーバーの設定(Ownerがショップに登録できる絵のキー)と、画面の絵の一覧がずれていないか確かめる
const config = readFileSync(fileURLToPath(new URL("../../../../config/world.php", import.meta.url)), "utf8");
const travel = readFileSync(fileURLToPath(new URL("../../../../config/travel.php", import.meta.url)), "utf8");

function phpArray(name: string): string {
  const match = config.match(new RegExp(`'${name}'\\s*=>\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`${name} が config/world.php に見つからない`);
  return match[1];
}

describe("町のアイテムの絵のキー", () => {
  it("config/world.php の asset_keys と同じ", () => {
    const keys = [...phpArray("asset_keys").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...ITEM_ART_KEYS].sort()).toEqual(keys.sort());
  });

  it("絵の大きさは config/world.php の asset_footprints と同じ(2×2・3×3)", () => {
    const sizes = Object.fromEntries([...phpArray("asset_footprints").matchAll(/'([a-z_]+)'\s*=>\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    expect({ ...ASSET_FOOTPRINTS }).toEqual(sizes);
  });

  it("大きさは、1(書いていない物)・2・3。大きな物(2以上)が isBigAsset", () => {
    expect(assetFootprint("bench")).toBe(1);
    expect(assetFootprint("pagoda")).toBe(3);
    expect(assetFootprint("castle")).toBe(3);
    expect(assetFootprint("fountain")).toBe(2);
    expect(assetFootprint("spru_mall")).toBe(3);
    expect(assetFootprint("chief_hall")).toBe(3);
    expect(assetFootprint(null)).toBe(1);
    expect(isBigAsset("bench")).toBe(false);
    expect(isBigAsset("spru_mall")).toBe(true);
    expect(isBigAsset(null)).toBe(false);
  });

  it("管理画面(ショップ編集)の絵の選択肢の名前が、すべての絵にある", () => {
    expect(Object.keys(ITEM_ART_LABELS).sort()).toEqual([...ITEM_ART_KEYS].sort());
  });

  it("絵のカテゴリは config/world.php の asset_categories と同じ", () => {
    const pairs = Object.fromEntries(
      [...phpArray("asset_categories").matchAll(/'([a-z_]+)'\s*=>\s*'([a-z]+)'/g)].map((m) => [m[1], m[2]]),
    );
    for (const key of ITEM_ART_KEYS) expect([key, pairs[key]]).toEqual([key, ITEM_ART_CATEGORIES[key]]);
  });

  it("管理画面の絵の選択肢は、名前にカテゴリと大きさを添える", () => {
    expect(artOptionLabel("bench")).toBe("ベンチ（かざり）");
    expect(artOptionLabel("pagoda")).toBe("五重塔（名所・3×3）");
    expect(artOptionLabel("fountain")).toBe("噴水（かざり・2×2）");
    expect(artOptionLabel("boat_large")).toBe("大きな船（のりもの・2×2）");
    expect(artOptionLabel("spru_mall")).toBe("スプルモール（名所・3×3）");
  });

  it("おみやげの絵のキーは config/travel.php のおみやげと同じ", () => {
    const keys = [...travel.matchAll(/\['key' => '([a-z_]+)', 'name' => '[^']+', 'condition' => '(?:stage|boss)'\]/g)].map(
      (m) => m[1],
    );
    expect(keys).toHaveLength(10);
    expect([...SOUVENIR_ART_KEYS].sort()).toEqual(keys.sort());
  });

  it("旅の行き先(config/travel.php)には、乗り物(ship か plane)が5つある", () => {
    const transports = [...travel.matchAll(/'transport' => '([a-z]+)'/g)].map((m) => m[1]);
    expect(transports).toHaveLength(5);
    for (const transport of transports) expect(["ship", "plane"]).toContain(transport);
  });

  it("2×2の絵かどうかを返す", () => {
    expect(isBigAsset("castle")).toBe(true);
    expect(isBigAsset("borobudur")).toBe(true);
    expect(isBigAsset("bench")).toBe(false);
    expect(isBigAsset("komodo")).toBe(false);
    expect(isBigAsset(null)).toBe(false);
  });
});
