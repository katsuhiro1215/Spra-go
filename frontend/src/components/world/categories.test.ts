import { describe, expect, it } from "vitest";

import {
  bagTabs,
  categoriesWithNew,
  inTab,
  isNewItem,
  pickTab,
  presentCategories,
  tabLabel,
  type ItemCategory,
} from "./categories";

const item = (category: ItemCategory | null, min_level = 1, locked = false) => ({ category, min_level, locked });

describe("ショップのタブ", () => {
  it("品のあるカテゴリだけを、しぜん→かざり→いえ・お店→名所→のりもの の順に返す", () => {
    expect(presentCategories([item("vehicle"), item("nature"), item("landmark"), item("nature")])).toEqual([
      "nature",
      "landmark",
      "vehicle",
    ]);
  });

  it("カテゴリが1つだけでもタブは1つ出る。品がなければ空", () => {
    expect(presentCategories([item("decor")])).toEqual(["decor"]);
    expect(presentCategories([])).toEqual([]);
  });

  it("カテゴリのない品(回復薬など)はタブにならない", () => {
    expect(presentCategories([item(null), item("house")])).toEqual(["house"]);
  });
});

describe("NEW", () => {
  it("鍵がなく、必要レベルが今のレベルと同じ物だけ", () => {
    expect(isNewItem({ min_level: 3, locked: false }, 3)).toBe(true);
    expect(isNewItem({ min_level: 2, locked: false }, 3)).toBe(false);
    expect(isNewItem({ min_level: 3, locked: true }, 3)).toBe(false);
  });

  it("Lv1の物にはNEWを付けない(最初から買える物で、レベルが上がって買えるようになった物ではない)", () => {
    expect(isNewItem({ min_level: 1, locked: false }, 1)).toBe(false);
  });

  it("NEW の物があるカテゴリに印を付ける", () => {
    expect(categoriesWithNew([item("nature", 3), item("decor", 1), item("house", 3, true)], 3)).toEqual(["nature"]);
  });
});

describe("バッグのタブ", () => {
  it("「すべて」が最初で、そのあとに品のあるカテゴリ(おみやげも)", () => {
    expect(bagTabs([item("souvenir"), item("nature")])).toEqual(["all", "nature", "souvenir"]);
    expect(bagTabs([])).toEqual(["all"]);
  });

  it("「すべて」は全部、カテゴリのタブはそのカテゴリの品だけ", () => {
    const items = [item("souvenir"), item("nature")];
    expect(inTab(items, "all")).toEqual(items);
    expect(inTab(items, "souvenir")).toEqual([item("souvenir")]);
  });

  it("タブの名前", () => {
    expect(tabLabel("all")).toBe("すべて");
    expect(tabLabel("nature")).toBe("しぜん");
    expect(tabLabel("house")).toBe("いえ・お店");
    expect(tabLabel("landmark")).toBe("名所");
    expect(tabLabel("souvenir")).toBe("おみやげ");
  });
});

describe("選んでいるタブ", () => {
  it("選んでいたタブがなくなったら最初のタブ。まだ選んでいなければ最初のタブ", () => {
    expect(pickTab<ItemCategory>(["nature", "decor"], "decor")).toBe("decor");
    expect(pickTab<ItemCategory>(["nature", "decor"], "house")).toBe("nature");
    expect(pickTab<ItemCategory>(["nature", "decor"], null)).toBe("nature");
    expect(pickTab<ItemCategory>([], null)).toBeNull();
  });
});
