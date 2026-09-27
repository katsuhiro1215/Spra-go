import { describe, expect, it } from "vitest";

import { localDateString, seasonGreeting, shouldShowSeasonGreeting } from "./season-greeting";

const on = (month: number, day: number) => new Date(2026, month - 1, day, 12, 0, 0);

describe("季節のあいさつの期間", () => {
  it.each([
    [9, 30, null],
    [10, 1, "halloween"],
    [10, 31, "halloween"],
    [11, 1, null],
    [11, 30, null],
    [12, 1, "christmas"],
    [12, 25, "christmas"],
    [12, 26, null],
    [1, 31, null],
    [2, 1, "valentine"],
    [2, 14, "valentine"],
    [2, 15, null],
    [7, 19, null],
    [7, 20, "summer"],
    [8, 31, "summer"],
    [9, 1, null],
  ])("%i月%i日は %s", (month, day, costume) => {
    expect(seasonGreeting(on(month, day))?.costume ?? null).toBe(costume);
  });

  it("あいさつの文は設計書のとおり", () => {
    expect(seasonGreeting(on(10, 5))?.line).toBe(
      "ハッピーハロウィン！ハロウィンは、アイルランドなどに昔から伝わるお祭りがもとなんだって",
    );
    expect(seasonGreeting(on(8, 1))?.line).toBe("なつやすみだね！沖縄の言葉で「めんそーれ」は「ようこそ」っていう意味だよ");
  });
});

describe("1日1回", () => {
  it("端末の日付を年-月-日にする", () => {
    expect(localDateString(on(2, 3))).toBe("2026-02-03");
  });

  it("期間中で、今日まだ出していなければ出す", () => {
    expect(shouldShowSeasonGreeting(on(10, 5), null)).toBe(true);
    expect(shouldShowSeasonGreeting(on(10, 5), "2026-10-04")).toBe(true);
    expect(shouldShowSeasonGreeting(on(10, 5), "2026-10-05")).toBe(false);
    expect(shouldShowSeasonGreeting(on(11, 5), null)).toBe(false);
  });
});
