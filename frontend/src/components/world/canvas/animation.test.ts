import { describe, expect, it } from "vitest";

import { bobOffset, cloudClear, foamOpacity, hopOffset, popState, pulseOpacity } from "./animation";

/** docs/design/2026-10-19-town-canvas-design.md 5章。globals.css のCSSの動きと同じ値 */

describe("上下にゆれる(spru-bob 2.4秒・0〜-3px)", () => {
  it("はじめと1周期のあとは0、半分で−3px", () => {
    expect(bobOffset(0)).toBeCloseTo(0);
    expect(bobOffset(1.2)).toBeCloseTo(-3);
    expect(bobOffset(2.4)).toBeCloseTo(0);
    expect(bobOffset(3.6)).toBeCloseTo(-3);
  });

  it("遅らせると、遅らせた分だけ動きが後ろにずれる(遅れの間は0)", () => {
    expect(bobOffset(0.5, 1)).toBe(0);
    expect(bobOffset(2.2, 1)).toBeCloseTo(-3);
  });

  it("周期を変えられる(仲間は3.2秒)", () => {
    expect(bobOffset(1.6, 0, 3.2)).toBeCloseTo(-3);
  });
});

describe("跳ねる(spru-hop 0.9秒を2回)", () => {
  it("0%・30%・55%・75%・100%の高さが、0・−14・0・−5・0", () => {
    expect(hopOffset(0)).toBeCloseTo(0);
    expect(hopOffset(0.9 * 0.3)).toBeCloseTo(-14);
    expect(hopOffset(0.9 * 0.55)).toBeCloseTo(0);
    expect(hopOffset(0.9 * 0.75)).toBeCloseTo(-5);
    expect(hopOffset(0.9)).toBeCloseTo(0);
  });

  it("2回目も同じ動き。2回のあと(1.8秒)は止まる", () => {
    expect(hopOffset(0.9 + 0.9 * 0.3)).toBeCloseTo(-14);
    expect(hopOffset(1.8)).toBe(0);
    expect(hopOffset(5)).toBe(0);
  });
});

describe("置ける場所の光(tile-pulse 1.1秒・0.55〜0.95)", () => {
  it("はじめは0.55、半分で0.95", () => {
    expect(pulseOpacity(0)).toBeCloseTo(0.55);
    expect(pulseOpacity(0.55)).toBeCloseTo(0.95);
    expect(pulseOpacity(1.1)).toBeCloseTo(0.55);
  });
});

describe("置いたときの「ぽん」(pop-in 0.45秒)", () => {
  it("はじめは0.3倍で見えない、60%で1.12倍、最後は1倍", () => {
    expect(popState(0)).toEqual({ scale: 0.3, opacity: 0 });
    expect(popState(0.45 * 0.6).scale).toBeCloseTo(1.12);
    expect(popState(0.45 * 0.6).opacity).toBe(1);
    expect(popState(0.45)).toEqual({ scale: 1, opacity: 1 });
    expect(popState(2)).toEqual({ scale: 1, opacity: 1 });
  });
});

describe("雲が晴れる(cloud-clear 1.2秒)", () => {
  it("はじめは見えて、最後は消えて上へ14px・1.18倍", () => {
    expect(cloudClear(0)).toEqual({ opacity: 1, dy: 0, scale: 1 });
    const end = cloudClear(1.2);
    expect(end.opacity).toBeCloseTo(0);
    expect(end.dy).toBeCloseTo(-14);
    expect(end.scale).toBeCloseTo(1.18);
    expect(cloudClear(5).opacity).toBe(0);
  });
});

describe("波の縁(town-foam)", () => {
  it("6秒の周期で、不透明度が0.55→0.9(3秒)→0.55と変わる", () => {
    expect(foamOpacity(0)).toBeCloseTo(0.55);
    expect(foamOpacity(3)).toBeCloseTo(0.9);
    expect(foamOpacity(6)).toBeCloseTo(0.55);
  });
});
