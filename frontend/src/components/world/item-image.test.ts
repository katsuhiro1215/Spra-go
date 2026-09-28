import { describe, expect, it } from "vitest";

import { iconViewBox, imagePlacement, itemImage } from "./item-image";

const square = { width: 256, height: 256 };
const tall = { width: 256, height: 512 };

describe("画像の置き場所", () => {
  it("1マスは幅57.6、画像の下の真ん中が原点から8だけ手前", () => {
    const p = imagePlacement(square, 1);
    expect(p.width).toBeCloseTo(57.6);
    expect(p.height).toBeCloseTo(57.6);
    expect(p.x).toBeCloseTo(-28.8);
    expect(p.y + p.height).toBeCloseTo(8);
  });

  it("2×2は幅115.2、下は16だけ手前。高さは縦横の比から", () => {
    const p = imagePlacement(tall, 2);
    expect(p.width).toBeCloseTo(115.2);
    expect(p.height).toBeCloseTo(230.4);
    expect(p.y + p.height).toBeCloseTo(16);
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
    const p = imagePlacement(tall, 2);
    const [x, y, w, h] = iconViewBox(p).split(" ").map(Number);
    expect(w).toBeCloseTo(238.4);
    expect(h).toBeCloseTo(238.4);
    expect(x).toBeLessThanOrEqual(p.x);
    expect(y).toBeLessThanOrEqual(p.y);
    expect(x + w).toBeGreaterThanOrEqual(p.x + p.width);
    expect(y + h).toBeGreaterThanOrEqual(p.y + p.height);
  });
});
