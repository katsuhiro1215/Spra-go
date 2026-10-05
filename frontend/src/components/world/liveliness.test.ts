import { describe, expect, it } from "vitest";

import { levelForScore, liveliness, livelinessNextText, livelinessScore, livelinessStars, livelinessUpLine } from "./liveliness";

const item = (shopItemId: number, placed = true) => ({ shop_item_id: shopItemId, x: placed ? 0 : null, y: placed ? 0 : null });

describe("にぎやか度の数え方", () => {
  it("種類ごとに1つ目は+3、同じ種類の2つ目からは+1", () => {
    expect(livelinessScore([item(1), item(1), item(1), item(2)], 0)).toBe(3 + 1 + 1 + 3);
  });

  it("バッグのアイテムは数えない", () => {
    expect(livelinessScore([item(1, false)], 0)).toBe(0);
  });

  it("仲間は1人+3", () => {
    expect(livelinessScore([item(1)], 2)).toBe(3 + 6);
  });

  it("2×2の建物は2倍で数える(1つ目+6、2つ目から+2)", () => {
    const castle = { ...item(9), footprint: 2 };
    expect(livelinessScore([castle, castle, item(1)], 0)).toBe(6 + 2 + 3);
  });
});

describe("にぎやか度の段階", () => {
  it("境目の数で段階が上がる", () => {
    expect([0, 5, 6, 14, 15, 26, 27, 41, 42, 68].map((score) => levelForScore(score).level)).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
    expect(levelForScore(15).label).toBe("にぎやか");
  });

  it("アイテムと仲間から段階を出す", () => {
    expect(liveliness([item(1), item(2), item(3)], 0)).toMatchObject({ score: 9, level: 2, label: "すこしにぎやか" });
  });

  it("次の段階まで、と★の並び", () => {
    expect(livelinessNextText(levelForScore(23))).toBe("とってもにぎやかまで あと4");
    expect(livelinessNextText(levelForScore(42))).toBe("町はおまつり！");
    expect(livelinessStars(3)).toBe("★★★☆☆");
  });

  it("段階が上がったときのひとこと", () => {
    expect(livelinessUpLine("にぎやか")).toBe("町がにぎやかになったね！『にぎやか』になったよ");
  });
});

describe("町がなじむ: 林・花畑のにぎやか度(設計書 2026-10-05-town-blend 4-3)", () => {
  const grove = (n: number, row = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: 100 + row * 10 + i, shop_item_id: 50 + row * 10 + i, x: i, y: row * 5, footprint: 1, asset_key: "tree" }));

  it("木を3本、隣り合わせに置くと、アイテム自体の分に加えて +4", () => {
    const base = livelinessScore(grove(3).map((t) => ({ ...t, asset_key: null })), 0);
    expect(livelinessScore(grove(3), 0)).toBe(base + 4);
  });

  it("2本だけなら、加点なし", () => {
    const base = livelinessScore(grove(2).map((t) => ({ ...t, asset_key: null })), 0);
    expect(livelinessScore(grove(2), 0)).toBe(base);
  });

  it("まとまりが4つあっても、加点は最大3つ分(+12)", () => {
    const items = [0, 1, 2, 3].flatMap((row) => grove(3, row));
    const base = livelinessScore(items.map((t) => ({ ...t, asset_key: null })), 0);
    expect(livelinessScore(items, 0)).toBe(base + 12);
  });
});
