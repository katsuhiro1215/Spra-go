import { describe, expect, it } from "vitest";

import { createRun, INVINCIBLE_MS } from "./run-engine";
import { bottomPct, isBlinkOff, leftPct, scrollCqw, spruPose } from "./run-view";

describe("run-view", () => {
  it("ゲームの中の位置を、場面の%にする", () => {
    expect(leftPct(200)).toBe("50%");
    expect(bottomPct(0)).toBe(`${(50 / 300) * 100}%`);
    expect(scrollCqw(400, 0.5)).toBe("-50cqw");
  });

  it("スプルの絵: 空中はジャンプ、ぶつかった直後はびっくり、走るときは交互", () => {
    const s = createRun(1);
    expect(spruPose({ ...s, y: 10 })).toBe("jump");
    expect(spruPose({ ...s, invincibleMs: INVINCIBLE_MS })).toBe("startled");
    expect(spruPose({ ...s, distance: 0 })).toBe("run");
    expect(spruPose({ ...s, distance: 40 })).toBe("walk");
  });

  it("点滅は、ぶつからない時間のあいだだけ", () => {
    const s = createRun(1);
    expect(isBlinkOff(s)).toBe(false);
    expect([0, 120, 240, 360].map((ms) => isBlinkOff({ ...s, invincibleMs: 1000 - ms }))).toContain(true);
  });
});
