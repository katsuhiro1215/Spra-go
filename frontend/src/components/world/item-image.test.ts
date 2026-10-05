import { describe, expect, it } from "vitest";

import { SPRU_ITEMS } from "@/components/spru/spru-assets";

import { ITEM_ART_KEYS, SOUVENIR_ART_KEYS } from "./art-keys";

import { iconViewBox, imagePlacement, itemImage, lightCircles } from "./item-image";

const square = { width: 256, height: 256 };
const big = { width: 512, height: 1024 };
const thin = { width: 64, height: 256 };

describe("画像の置き場所(設計書 2026-09-28-town-items 7-2)", () => {
  it("幅は画像の幅×0.225。256pxは57.6で、画像の下の真ん中が原点から8だけ手前", () => {
    const p = imagePlacement(square, 1);
    expect(p.width).toBeCloseTo(57.6);
    expect(p.height).toBeCloseTo(57.6);
    expect(p.x).toBeCloseTo(-28.8);
    expect(p.y + p.height).toBeCloseTo(8);
  });

  it("2×2でも幅は画像の幅どおり(512pxで115.2)。下は16だけ手前。高さは縦横の比から", () => {
    const p = imagePlacement(big, 2);
    expect(p.width).toBeCloseTo(115.2);
    expect(p.height).toBeCloseTo(230.4);
    expect(p.y + p.height).toBeCloseTo(16);
  });

  it("細い画像は細く出て、幅は足元のマスの数によらない", () => {
    expect(imagePlacement(thin, 1).width).toBeCloseTo(14.4);
    expect(imagePlacement(thin, 1).height).toBeCloseTo(57.6);
    expect(imagePlacement(thin, 2).width).toBeCloseTo(14.4);
  });

  it("物ごとの調整値(scale・dx・dy)が効く", () => {
    const p = imagePlacement(square, 1, { scale: 1.5, dx: 4, dy: -3 });
    expect(p.width).toBeCloseTo(86.4);
    expect(p.x).toBeCloseTo(-39.2);
    expect(p.y + p.height).toBeCloseTo(5);
  });
});

describe("画像があるか", () => {
  it("一覧にある絵は画像、ない絵・キーなしは null", () => {
    const images = { tree: { src: "/spru/items/tree.webp", width: 256, height: 300 } };
    expect(itemImage("tree", images)).toEqual(images.tree);
    expect(itemImage("bench", images)).toBeNull();
    expect(itemImage(null, images)).toBeNull();
  });
});

describe("小さな絵の範囲", () => {
  it("画像の範囲に余白を足した正方形で、背の高い画像もはみ出さない", () => {
    const p = imagePlacement(big, 2);
    const [x, y, w, h] = iconViewBox(p).split(" ").map(Number);
    expect(w).toBeCloseTo(238.4);
    expect(h).toBeCloseTo(238.4);
    expect(x).toBeLessThanOrEqual(p.x);
    expect(y).toBeLessThanOrEqual(p.y);
    expect(x + w).toBeGreaterThanOrEqual(p.x + p.width);
    expect(y + h).toBeGreaterThanOrEqual(p.y + p.height);
  });
});

describe("夜の光の輪(設計書 2026-09-28-town-items 7-3)", () => {
  const images = { lamp: { src: "/spru/items/lamp.webp", width: 128, height: 256 } };
  const lights = { lamp: [{ x: 0.5, y: 0.25, r: 6 }] };

  it("画像の中の割合の位置が、置き場所に合わせたSVGの位置になる", () => {
    // 幅 28.8・高さ 57.6・左 -14.4・上 8-57.6=-49.6
    const [c] = lightCircles("lamp", 1, images, lights, {});
    expect(c.cx).toBeCloseTo(0);
    expect(c.cy).toBeCloseTo(-35.2);
    expect(c.r).toBe(6);
  });

  it("大きさの調整(scale)を変えても、絵の同じ所に付く", () => {
    // 幅 57.6・高さ 115.2・左 -28.8・上 8-115.2=-107.2
    const [c] = lightCircles("lamp", 1, images, lights, { lamp: { scale: 2 } });
    expect(c.cx).toBeCloseTo(0);
    expect(c.cy).toBeCloseTo(-78.4);
  });

  it("はっぱの街灯のランタンに、光の輪が1つ付く(絵の左側・中ほど)", () => {
    const circles = lightCircles("leaf_lamp", 1);
    const p = imagePlacement(SPRU_ITEMS.leaf_lamp, 1);
    expect(circles).toHaveLength(1);
    expect(circles[0].cx).toBeGreaterThan(p.x);
    expect(circles[0].cx).toBeLessThan(p.x + p.width / 2);
    expect(circles[0].cy).toBeGreaterThan(p.y + p.height * 0.3);
    expect(circles[0].cy).toBeLessThan(p.y + p.height * 0.6);
  });

  it("明かりのない物・画像のない物・キーなしは空", () => {
    expect(lightCircles("lamp", 1, images, {}, {})).toEqual([]);
    expect(lightCircles("tree", 1, images, { tree: [{ x: 0.5, y: 0.5, r: 5 }] }, {})).toEqual([]);
    expect(lightCircles(null, 1, images, lights, {})).toEqual([]);
  });
});

describe("すべての絵に画像がある(設計書 2026-09-28-town-items 7-5)", () => {
  // config/world.php の land の landmarks のうち、畑(garden)は素材集の切り抜きのままなので除く
  const LANDMARK_KEYS = ["spru_house", "torii", "stone_lantern", "bamboo_grove", "pier"];

  it("アイテム・おみやげ・目印のすべてのキーに SPRU_ITEMS の画像がある", () => {
    const missing = [...ITEM_ART_KEYS, ...SOUVENIR_ART_KEYS, ...LANDMARK_KEYS].filter((key) => !(key in SPRU_ITEMS));
    expect(missing).toEqual([]);
  });
});
