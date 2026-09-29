import { describe, expect, it } from "vitest";

import { progressPercent, remainingText, statusNote, townAction, townCountText } from "./roster";

const condition = (current: number, target: number, unit = "日") => ({ text: "7日続けて学ぶ", current, target, unit });

describe("remainingText", () => {
  it("あと何日・何レベルかを出し、届いたら「もうすぐもらえるよ」", () => {
    expect(remainingText(condition(4, 7))).toBe("あと3日");
    expect(remainingText(condition(8, 10, "レベル"))).toBe("あと2レベル");
    expect(remainingText(condition(7, 7))).toBe("もうすぐもらえるよ");
  });
});

describe("progressPercent", () => {
  it("目標までの割合で、100で止まる", () => {
    expect(progressPercent(condition(4, 7))).toBe(57);
    expect(progressPercent(condition(0, 1))).toBe(0);
    expect(progressPercent(condition(9, 7))).toBe(100);
  });
});

describe("statusNote", () => {
  it("状態ごとの一言。生まれた子と、まだのレアスプルは無し", () => {
    expect(statusNote({ status: "waiting", rare: false })).toBe("畑で生まれるよ");
    expect(statusNote({ status: "in_bag", rare: true })).toBe("種のふくろにあるよ");
    expect(statusNote({ status: "growing", rare: true })).toBe("畑で育っているよ");
    expect(statusNote({ status: "waiting", rare: true })).toBeNull();
    expect(statusNote({ status: "born", rare: true })).toBeNull();
  });
});

describe("townAction", () => {
  it("相棒は切り替えられず、町にいる子は休める。おうちの子は町がいっぱいなら出せない", () => {
    expect(townAction({ in_town: true, is_partner: true }, 5, 5)).toBeNull();
    expect(townAction({ in_town: true, is_partner: false }, 5, 5)).toEqual({ label: "おうちで休む", inTown: false, disabled: false });
    expect(townAction({ in_town: false, is_partner: false }, 4, 5)).toEqual({ label: "町に出す", inTown: true, disabled: false });
    expect(townAction({ in_town: false, is_partner: false }, 5, 5)).toEqual({ label: "町はいっぱい", inTown: true, disabled: true });
  });
});

describe("townCountText", () => {
  it("町にいる数", () => {
    expect(townCountText(3, 5)).toBe("町にいるのは 3/5");
  });
});
