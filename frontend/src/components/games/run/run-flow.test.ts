import { describe, expect, it } from "vitest";

import { playsLeftText, quitAction, quitMessage, realButtonState } from "./run-flow";

describe("スプルランの流れ(docs/design/2026-10-22-spru-run-design.md 14-2)", () => {
  it("始めて9秒までのやめるは回を戻し、それをこえたらそこまでの記録で終える(サーバーの10秒より少し手前で分ける)", () => {
    expect(quitAction(0)).toBe("abandon");
    expect(quitAction(9000)).toBe("abandon");
    expect(quitAction(9001)).toBe("finish");
  });

  it("やめる確認の文は、練習・本番の序盤・本番の途中で変わる", () => {
    expect(quitMessage("practice", 20_000)).toContain("練習");
    expect(quitMessage("real", 3000)).toContain("数えない");
    expect(quitMessage("real", 30_000)).toContain("ここまでの記録");
  });

  it("本番のボタン: のこりがあれば押せる。0なら押せず、あしたの案内を出す。読み込み前は押せない", () => {
    expect(realButtonState(null)).toEqual({ enabled: false, label: "本番にちょうせん" });
    expect(realButtonState(2)).toEqual({ enabled: true, label: "本番にちょうせん（のこり2回）" });
    expect(realButtonState(0)).toEqual({ enabled: false, label: "本番はあしたまた来てね" });
  });

  it("のこり回数の文", () => {
    expect(playsLeftText(1)).toBe("きょうの本番は、あと1回");
    expect(playsLeftText(0)).toBe("きょうの本番は、おしまい");
  });
});
