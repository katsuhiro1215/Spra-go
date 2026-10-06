import { describe, expect, it } from "vitest";

import { roadPath, stageMapLayout, walkerTarget } from "./stage-map";

describe("ステージの道の配置", () => {
  it("10個なら位置が10個。下から上へ並び、最後(ボス)がいちばん上。x は幅の中", () => {
    const { points, height } = stageMapLayout(10, 320);

    expect(points).toHaveLength(10);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].y).toBeLessThan(points[i - 1].y);
    }
    expect(Math.min(...points.map((p) => p.y))).toBe(points[9].y);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(32);
      expect(p.x).toBeLessThanOrEqual(320 - 32);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(height);
    }
  });

  it("1個でも、0個でも動く", () => {
    expect(stageMapLayout(1, 320).points).toHaveLength(1);
    expect(stageMapLayout(0, 320).points).toEqual([]);
  });

  it("左右に揺れる(同じ位置が続かない)", () => {
    const xs = stageMapLayout(5, 320).points.map((p) => p.x);

    expect(new Set(xs).size).toBeGreaterThan(2);
  });
});

describe("スプルの立つ位置", () => {
  const stage = (cleared: boolean, locked = false) => ({ cleared, locked });

  it("何もクリアしていなければ最初。3つクリアなら4番目(次に遊ぶ)", () => {
    expect(walkerTarget([stage(false), stage(false, true)])).toBe(0);
    expect(walkerTarget([stage(true), stage(true), stage(true), stage(false), stage(false, true)])).toBe(3);
  });

  it("全部クリアなら最後。ステージがなければ null", () => {
    expect(walkerTarget([stage(true), stage(true)])).toBe(1);
    expect(walkerTarget([])).toBeNull();
  });
});

describe("道の線", () => {
  it("点をなめらかにつなぐ線(M から始まる)。点が1つ以下なら空", () => {
    const { points } = stageMapLayout(4, 320);

    expect(roadPath(points)).toMatch(/^M [\d.]+ [\d.]+( C [\d. ]+)+$/);
    expect(roadPath(points.slice(0, 1))).toBe("");
    expect(roadPath([])).toBe("");
  });
});
