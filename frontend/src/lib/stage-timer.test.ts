import { describe, expect, it } from "vitest";

import { advanceElapsed, ruleLines, secondsLeft, timerSeconds, timerTone } from "./stage-timer";

describe("timerSeconds", () => {
  it("ふつうはそのまま、ゆっくりは2倍、なしは計らない", () => {
    expect(timerSeconds(40, "normal")).toBe(40);
    expect(timerSeconds(40, "slow")).toBe(80);
    expect(timerSeconds(40, "off")).toBeNull();
  });

  it("秒数がないデータ(古い問題・復習)は計らない", () => {
    expect(timerSeconds(undefined, "normal")).toBeNull();
    expect(timerSeconds(null, "slow")).toBeNull();
    expect(timerSeconds(0, "normal")).toBeNull();
  });
});

describe("advanceElapsed・secondsLeft", () => {
  it("止めているあいだは足さない", () => {
    expect(advanceElapsed(1000, 200, true)).toBe(1200);
    expect(advanceElapsed(1000, 200, false)).toBe(1000);
    expect(advanceElapsed(1000, -50, true)).toBe(1000);
  });

  it("残りは切り上げで、0より下にならない", () => {
    expect(secondsLeft(30, 0)).toBe(30);
    expect(secondsLeft(30, 100)).toBe(30);
    expect(secondsLeft(30, 1100)).toBe(29);
    expect(secondsLeft(30, 29999)).toBe(1);
    expect(secondsLeft(30, 30000)).toBe(0);
    expect(secondsLeft(30, 45000)).toBe(0);
  });
});

describe("timerTone", () => {
  it("半分までは緑、半分以下はオレンジ、残り5秒以下は赤", () => {
    expect(timerTone(30, 40)).toBe("ok");
    expect(timerTone(20, 40)).toBe("warn");
    expect(timerTone(6, 40)).toBe("warn");
    expect(timerTone(5, 40)).toBe("danger");
    expect(timerTone(0, 40)).toBe("danger");
  });
});

describe("ruleLines", () => {
  it("通常のステージ", () => {
    expect(ruleLines({ playCount: 10, required: 6, isBoss: false, seconds: 40 })).toEqual([
      "10もん ちゅう 6もん せいかい で クリア！",
      "1もん 40びょう",
      "まちがえると HP −1",
    ]);
  });

  it("ボスは先頭に一行足す。時間を計らないときは、時間の行がない", () => {
    expect(ruleLines({ playCount: 10, required: 8, isBoss: true, seconds: null })).toEqual([
      "ボスステージ！",
      "10もん ちゅう 8もん せいかい で クリア！",
      "まちがえると HP −1",
    ]);
  });
});
