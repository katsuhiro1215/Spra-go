import { describe, expect, it } from "vitest";

import {
  checkNickname,
  heartsText,
  nextHeartText,
  pickLine,
  pickSpruTap,
  reviewGiverKey,
  reviewPrompt,
} from "./companions";
import type { WorldReview } from "./types";

const review = (overrides: Partial<WorldReview> = {}): WorldReview => ({
  available: false,
  count: 0,
  giver: { kind: "spru", key: null, name: "スプル" },
  ...overrides,
});
const momoReview = review({ available: true, count: 3, giver: { kind: "companion", key: "momo", name: "モモ" } });

describe("heartsText", () => {
  it("♥が今の数、♡が残り(5つ)", () => {
    expect(heartsText(1)).toBe("♥♡♡♡♡");
    expect(heartsText(5)).toBe("♥♥♥♥♥");
  });
});

describe("nextHeartText", () => {
  it("次のハートまでの残り", () => {
    expect(nextHeartText({ hearts: 3, bond: 88, next_heart_bond: 100 })).toBe("ハート4つまで あと12");
  });

  it("ハート5つなら しんゆう", () => {
    expect(nextHeartText({ hearts: 5, bond: 200, next_heart_bond: null })).toBe("しんゆう！");
  });
});

describe("pickLine", () => {
  it("覚えたひとことから選ぶ", () => {
    const lines = ["ア", "イ", "ウ"];
    expect(pickLine(lines, 0)).toBe("ア");
    expect(pickLine(lines, 0.5)).toBe("イ");
    expect(pickLine(lines, 0.99)).toBe("ウ");
  });

  it("ひとことが無ければ空", () => {
    expect(pickLine([], 0.3)).toBe("");
  });
});

describe("checkNickname", () => {
  it("前後の空白(全角も)を取る", () => {
    expect(checkNickname("　モモちゃん ")).toEqual({ ok: true, value: "モモちゃん" });
  });

  it("空や空白だけなら、元の名前に戻す(null)", () => {
    expect(checkNickname("")).toEqual({ ok: true, value: null });
    expect(checkNickname("  　")).toEqual({ ok: true, value: null });
  });

  it("8文字まではよい", () => {
    expect(checkNickname("あいうえおかきく")).toEqual({ ok: true, value: "あいうえおかきく" });
  });

  it("9文字以上はだめ", () => {
    expect(checkNickname("あいうえおかきくけ")).toEqual({ ok: false, message: "8文字までにしてね" });
  });

  it("改行などはだめ", () => {
    expect(checkNickname("モ\nモ")).toEqual({ ok: false, message: "使えない文字が入っているよ" });
  });
});

describe("pickSpruTap", () => {
  it("種がまけるなら、復習より先に種まき", () => {
    expect(pickSpruTap({ canSow: true, review: review({ available: true, count: 2 }) })).toBe("sow");
  });

  it("スプルが出す復習があれば、復習カード", () => {
    expect(pickSpruTap({ canSow: false, review: review({ available: true, count: 2 }) })).toBe("review");
  });

  it("相棒が出す復習の日は、スプルはふだんどおり", () => {
    expect(pickSpruTap({ canSow: false, review: momoReview })).toBe("chat");
  });

  it("復習が無ければ、ふだんどおり", () => {
    expect(pickSpruTap({ canSow: false, review: review() })).toBe("chat");
  });
});

describe("reviewPrompt", () => {
  it("相棒が出す日は、相棒の名前で案内する", () => {
    expect(reviewPrompt(momoReview)).toBe("モモが復習を用意してるよ");
  });

  it("スプルが出す日", () => {
    expect(reviewPrompt(review({ available: true, count: 1 }))).toBe("この前の問題、いっしょに復習しよう！");
  });

  it("復習が無い日は、案内しない", () => {
    expect(reviewPrompt(review())).toBeNull();
  });
});

describe("reviewGiverKey", () => {
  it("復習が無い日は、「！」を出さない", () => {
    expect(reviewGiverKey(review())).toBeNull();
  });

  it("スプルが出す日は spru", () => {
    expect(reviewGiverKey(review({ available: true, count: 1 }))).toBe("spru");
  });

  it("相棒が出す日は、相棒のキー", () => {
    expect(reviewGiverKey(momoReview)).toBe("momo");
  });
});
