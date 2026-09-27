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
