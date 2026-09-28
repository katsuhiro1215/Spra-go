import { describe, expect, it } from "vitest";

import { streakLineBonusCoin, streakMilestoneBadge, streakMilestoneLine } from "./streak-milestone";

describe("連続プレイの節目のバッジ", () => {
  it("3日・7日・30日は、その日数の炎のバッジ", () => {
    expect(streakMilestoneBadge(3)).toBe("streak-3");
    expect(streakMilestoneBadge(7)).toBe("streak-7");
    expect(streakMilestoneBadge(30)).toBe("streak-30");
  });

  it("節目でない日数は、バッジなし", () => {
    expect(streakMilestoneBadge(0)).toBeNull();
    expect(streakMilestoneBadge(2)).toBeNull();
    expect(streakMilestoneBadge(14)).toBeNull();
  });
});

describe("節目のお祝いの一言", () => {
  it("初めては、バッジをもらったことを知らせる", () => {
    expect(streakMilestoneLine(3, true)).toBe("バッジをゲット！パスポートに入れたよ");
  });

  it("2回目からは、また続いたことをほめる", () => {
    expect(streakMilestoneLine(7, false)).toBe("また7日つづいたね！");
  });
});

describe("答えのカードの連続プレイの行に出すボーナス", () => {
  it("節目の日は、お祝いの画面で出すので行には出さない", () => {
    expect(streakLineBonusCoin(50, 7)).toBe(0);
  });

  it("節目でない日は、今までどおり行に出す", () => {
    expect(streakLineBonusCoin(50, null)).toBe(50);
    expect(streakLineBonusCoin(0, null)).toBe(0);
  });
});
