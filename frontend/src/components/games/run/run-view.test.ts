import { describe, expect, it } from "vitest";

import { createRun, INVINCIBLE_MS, PLATFORM_STEP, PLATFORM_TOPS, WORLD_W } from "./run-engine";
import { bottomCss, GROUND_CQH, isBlinkOff, obstacleDraw, platformDraw, PLATFORM_DRAW_H, scrollCqw, sizeCqw, spruDraw, spruPose } from "./run-view";

describe("run-view", () => {
  it("ゲームの中の大きさは横幅の割合、高さは地面(画面の下から GROUND_CQH %)からの位置にする", () => {
    expect(sizeCqw(WORLD_W / 2)).toBe("50cqw");
    expect(bottomCss(0)).toBe(`calc(${GROUND_CQH}cqh + 0cqw)`);
    expect(bottomCss(WORLD_W / 10)).toBe(`calc(${GROUND_CQH}cqh + 10cqw)`);
    expect(scrollCqw(WORLD_W, 0.5)).toBe("-50cqw");
  });

  it("スプルの絵: 空中はジャンプ(2段目は丸まる)、ぶつかった直後はびっくり、走るときは2枚を交互", () => {
    const s = createRun(1);
    expect(spruPose({ ...s, y: 10, jumps: 1, standing: false })).toBe("jump");
    expect(spruPose({ ...s, y: 10, jumps: 2, standing: false })).toBe("double-jump");
    expect(spruPose({ ...s, y: 56, jumps: 0, standing: true, distance: 0 })).toBe("run-a"); // 床の上は、走る絵
    expect(spruPose({ ...s, y: 10, jumps: 3, standing: false })).toBe("triple-jump");
    expect(spruPose({ ...s, invincibleMs: INVINCIBLE_MS })).toBe("hit");
    expect(spruPose({ ...s, distance: 0 })).toBe("run-a");
    expect(spruPose({ ...s, distance: 40 })).toBe("run-b");
  });

  it("スプルは、走る1枚目の高さを基準に、どのポーズも同じ倍率で描く", () => {
    const runA = spruDraw("run-a", 78);
    const hit = spruDraw("hit", 78);
    expect(runA.height).toBe(78);
    expect(hit.height).toBeGreaterThan(78); // ぶつかった絵は、元の絵が少し大きい
    expect(hit.width / hit.height).toBeCloseTo(206 / 266, 2);
  });

  it("じゃまものの絵は、当たりの箱の真ん中に、絵の形のまま描く", () => {
    const rock = obstacleDraw({ kind: "rock", x: 0, w: 50, h: 36, hit: false });
    expect(rock.height).toBeGreaterThan(36);
    expect(rock.width / rock.height).toBeCloseTo(362 / 220, 2);
    expect(rock.left + rock.width / 2).toBeCloseTo(25, 5);
  });

  it("点滅は、ぶつからない時間のあいだだけ", () => {
    const s = createRun(1);
    expect(isBlinkOff(s)).toBe(false);
    expect([0, 120, 240, 360].map((ms) => isBlinkOff({ ...s, invincibleMs: 1000 - ms }))).toContain(true);
  });

  it("床の絵は、上の面が床の高さにそろう。1〜2段目は草、3段目から上は雲", () => {
    const low = platformDraw({ x: 0, w: 200, top: PLATFORM_TOPS.low });
    const third = platformDraw({ x: 0, w: 200, top: PLATFORM_TOPS.low + PLATFORM_STEP * 2 });
    expect(low.art).toBe("grass");
    expect(platformDraw({ x: 0, w: 200, top: PLATFORM_TOPS.high }).art).toBe("grass");
    expect(third.art).toBe("cloud");
    // 絵の下の端は、床の高さより下(絵の大部分は、上の面の下にある)
    expect(low.bottom).toBeLessThan(PLATFORM_TOPS.low);
    expect(low.bottom + low.height).toBeGreaterThan(PLATFORM_TOPS.low);
    expect(low.height).toBe(PLATFORM_DRAW_H);
  });
});
