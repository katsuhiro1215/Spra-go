import { describe, expect, it } from "vitest";

import { filterItems, noFilter, sizeText, unusedArtKeys, type ListItem } from "./filter";

const item = (id: number, over: Partial<ListItem>): ListItem => ({
  id, name: `item${id}`, type: "decoration", category: "house", w: 2, h: 2, meta: { asset_key: "bakery" }, ...over,
});

const items = [
  item(1, { name: "パン屋" }),
  item(2, { name: "ベンチ", category: "decor", w: 1, h: 1, meta: { asset_key: "bench" } }),
  item(3, { name: "長屋", w: 3, h: 2, meta: { asset_key: "nagaya" } }),
  item(4, { name: "回復薬", type: "potion", category: null, w: null, h: null, meta: null }),
];

describe("filterItems", () => {
  it("絞り込みなしなら全部", () => {
    expect(filterItems(items, noFilter)).toHaveLength(4);
  });

  it("名前と絵のキーで探せる", () => {
    expect(filterItems(items, { ...noFilter, query: "パン" }).map((i) => i.id)).toEqual([1]);
    expect(filterItems(items, { ...noFilter, query: "BENCH" }).map((i) => i.id)).toEqual([2]);
  });

  it("カテゴリ・種類で絞れる", () => {
    expect(filterItems(items, { ...noFilter, category: "decor" }).map((i) => i.id)).toEqual([2]);
    expect(filterItems(items, { ...noFilter, type: "potion" }).map((i) => i.id)).toEqual([4]);
  });

  it("大きさで絞れる。町のアイテム以外は大きさを持たない", () => {
    expect(filterItems(items, { ...noFilter, size: "2x2" }).map((i) => i.id)).toEqual([1]);
    expect(filterItems(items, { ...noFilter, size: "rect" }).map((i) => i.id)).toEqual([3]);
    expect(filterItems(items, { ...noFilter, size: "big" }).map((i) => i.id)).toEqual([1, 3]);
    expect(filterItems(items, { ...noFilter, size: "1x1" }).map((i) => i.id)).toEqual([2]);
  });
});

describe("sizeText", () => {
  it("幅×高さ。持たなければ null", () => {
    expect(sizeText({ w: 3, h: 2 })).toBe("3×2");
    expect(sizeText({ w: null, h: null })).toBeNull();
  });
});

describe("unusedArtKeys", () => {
  it("どのアイテムも使っていない絵を返す", () => {
    const unused = unusedArtKeys(items);
    expect(unused).not.toContain("bakery");
    expect(unused).not.toContain("bench");
    expect(unused).toContain("tree");
  });
});
