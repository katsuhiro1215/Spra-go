import { describe, expect, it } from "vitest";

import { SPRU_ITEMS } from "@/components/spru/spru-assets";

import { isZukanComplete, zukanImage, zukanProgress } from "./zukan";

describe("パンとやさいのずかん", () => {
  it("集めた数は「3 / 15」の形", () => {
    expect(zukanProgress(3, 15)).toBe("3 / 15");
    expect(zukanProgress(0, 15)).toBe("0 / 15");
  });

  it("全部そろったときだけ、そろったと言う", () => {
    expect(isZukanComplete(15, 15)).toBe(true);
    expect(isZukanComplete(14, 15)).toBe(false);
    expect(isZukanComplete(0, 0)).toBe(false);
  });

  it("絵は SPRU_ITEMS の zukan_{キー} を引き、なければ null", () => {
    const images = { zukan_melon_bread: { src: "/spru/items/zukan_melon_bread.webp", width: 192, height: 150 } };
    expect(zukanImage("melon_bread", images)).toEqual(images.zukan_melon_bread);
    expect(zukanImage("anpan", images)).toBeNull();
  });

  it("設定の15点すべてに絵がある", () => {
    const keys = [
      "fresh_bread_loaf", "shokupan", "baguette", "croissant", "melon_bread", "anpan", "curry_bread", "custard_bun",
      "sandwich", "fruit_danish", "wheat", "flour", "carrot", "potato", "onion",
    ];
    const missing = keys.filter((key) => !(`zukan_${key}` in SPRU_ITEMS));
    expect(missing).toEqual([]);
  });
});
