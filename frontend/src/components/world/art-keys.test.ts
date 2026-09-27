import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { BIG_ASSETS, ITEM_ART_KEYS, ITEM_ART_LABELS, SOUVENIR_ART_KEYS, isBigAsset } from "./art-keys";

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

  it("2×2の絵は config/world.php の asset_footprints と同じ", () => {
    const big = [...phpArray("asset_footprints").matchAll(/'([a-z_]+)'\s*=>\s*2/g)].map((m) => m[1]);
    expect([...BIG_ASSETS].sort()).toEqual(big.sort());
  });

  it("管理画面(ショップ編集)の絵の選択肢の名前が、すべての絵にある", () => {
    expect(Object.keys(ITEM_ART_LABELS).sort()).toEqual([...ITEM_ART_KEYS].sort());
  });

  it("おみやげの絵のキーは config/travel.php のおみやげと同じ", () => {
    const keys = [...travel.matchAll(/\['key' => '([a-z_]+)', 'name' => '[^']+', 'condition' => '(?:stage|boss)'\]/g)].map(
      (m) => m[1],
    );
    expect(keys).toHaveLength(10);
    expect([...SOUVENIR_ART_KEYS].sort()).toEqual(keys.sort());
  });

  it("旅じたく(config/travel.php の items)の絵は、町のアイテムの絵にある", () => {
    const gear = [...travel.matchAll(/'items' => \['([a-z_]+)' =>/g)].map((m) => m[1]);
    expect(gear).toHaveLength(5);
    for (const key of gear) expect(ITEM_ART_KEYS).toContain(key);
  });

  it("2×2の絵かどうかを返す", () => {
    expect(isBigAsset("castle")).toBe(true);
    expect(isBigAsset("borobudur")).toBe(true);
    expect(isBigAsset("bench")).toBe(false);
    expect(isBigAsset("komodo")).toBe(false);
    expect(isBigAsset(null)).toBe(false);
  });
});
