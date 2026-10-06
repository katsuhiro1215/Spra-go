import { describe, expect, it } from "vitest";

import { levelLabel, ringFraction, ringOffset, xpToNextText } from "./level-ring";

describe("輪の伸び(XPの割合)", () => {
  const range = { floor: 100, next: 210 };

  it("今のレベルに届いた直後は0、次のレベルの手前は1に近い", () => {
    expect(ringFraction(100, range)).toBe(0);
    expect(ringFraction(155, range)).toBeCloseTo(0.5);
    expect(ringFraction(209, range)).toBeCloseTo(109 / 110);
  });

  it("範囲の外は0〜1に丸める", () => {
    expect(ringFraction(50, range)).toBe(0);
    expect(ringFraction(500, range)).toBe(1);
  });

  it("範囲がおかしい(次が今以下)ときは0", () => {
    expect(ringFraction(120, { floor: 100, next: 100 })).toBe(0);
    expect(ringFraction(120, { floor: 100, next: 90 })).toBe(0);
  });

  it("まだ読み込まれていない(範囲なし)ときも0", () => {
    expect(ringFraction(0, undefined)).toBe(0);
  });
});

describe("輪の線の長さ(dashoffset)", () => {
  it("割合0で輪の全周ぶん、割合1で0(全部伸びた状態)", () => {
    expect(ringOffset(100, 0)).toBe(100);
    expect(ringOffset(100, 1)).toBe(0);
    expect(ringOffset(100, 0.25)).toBe(75);
  });
});

describe("次のレベルまで", () => {
  it("あと◯XP", () => {
    expect(xpToNextText(150, { floor: 100, next: 210 })).toBe("あと 60 XP");
    expect(xpToNextText(1590, { floor: 100, next: 1595 })).toBe("あと 5 XP");
  });

  it("届いたあと・範囲なしは、あと 0 XP や空にせず、出さない(null)", () => {
    expect(xpToNextText(210, { floor: 100, next: 210 })).toBeNull();
    expect(xpToNextText(0, undefined)).toBeNull();
  });

  it("桁区切りを入れる", () => {
    expect(xpToNextText(0, { floor: 0, next: 12345 })).toBe("あと 12,345 XP");
  });
});

describe("レベルの表示(読み上げ)", () => {
  it("レベルと、わかっていれば次までのXP", () => {
    expect(levelLabel(5, { floor: 100, next: 210 }, 150)).toBe("レベル5。次のレベルまで、あと 60 XP");
    expect(levelLabel(5, undefined, 0)).toBe("レベル5");
  });
});
