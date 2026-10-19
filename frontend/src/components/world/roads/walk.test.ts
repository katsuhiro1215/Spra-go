import { describe, expect, it } from "vitest";

import type { WorldLand } from "../types";
import { facing, idleWalker, isWalking, routeTo, stepWalker, walkableTiles, walkFrame, walkTo, WALK_SPEED } from "./walk";

/** docs/design/2026-10-19-town-roads-design.md 3-2・5-1 */

const open = (x: number, y: number) => x >= 0 && y >= 0 && x < 6 && y < 6;

describe("経路(4方向の最短)", () => {
  it("同じマス・行けないマスへは、経路なし", () => {
    expect(routeTo([1, 1], [1, 1], open)).toEqual([]);
    expect(routeTo([1, 1], [9, 9], open)).toEqual([]);
    expect(routeTo([1, 1], [2, 1], (x, y) => open(x, y) && !(x === 2 && y === 1))).toEqual([]);
  });

  it("最短で、いまのマスは含まず、着くマスを含む。となりのマスだけでつながる", () => {
    const path = routeTo([0, 0], [3, 2], open);
    expect(path).toHaveLength(5);
    expect(path.at(-1)).toEqual([3, 2]);
    let prev: [number, number] = [0, 0];
    for (const p of path) {
      expect(Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1])).toBe(1);
      prev = p;
    }
  });

  it("かべをよけて回る", () => {
    // x=2 の壁(y=0〜4)。下(y=5)があいている
    const wall = (x: number, y: number) => open(x, y) && !(x === 2 && y <= 4);
    const path = routeTo([1, 0], [3, 0], wall);
    expect(path.length).toBeGreaterThan(2);
    expect(path.some(([x, y]) => x === 2 && y === 5)).toBe(true);
    expect(path.every(([x, y]) => wall(x, y))).toBe(true);
  });

  it("行けない所に囲まれていたら、経路なし", () => {
    const boxed = (x: number, y: number) => open(x, y) && (x === 0 && y === 0 || x >= 3);
    expect(routeTo([0, 0], [4, 4], boxed)).toEqual([]);
  });
});

describe("向き", () => {
  it("+x は右下、−x は左上、+y は左下、−y は右上", () => {
    expect(facing(1, 0)).toBe("lower_right");
    expect(facing(-1, 0)).toBe("upper_left");
    expect(facing(0, 1)).toBe("lower_left");
    expect(facing(0, -1)).toBe("upper_right");
  });
});

describe("歩く", () => {
  it("1秒に WALK_SPEED マス進み、着いたら止まって、ぴったりそのマスになる", () => {
    let w = walkTo(idleWalker(0, 0), [3, 0], open);
    expect(isWalking(w)).toBe(true);
    w = stepWalker(w, 1);
    expect(w.x).toBeCloseTo(WALK_SPEED);
    expect(w.y).toBe(0);
    w = stepWalker(w, 5);
    expect(isWalking(w)).toBe(false);
    expect([w.x, w.y]).toEqual([3, 0]);
  });

  it("1回の大きな時間でも、角を曲がって進む。向きが変わる", () => {
    let w = walkTo(idleWalker(0, 0), [2, 2], open);
    expect(w.dir).toBe("lower_right");
    w = stepWalker(w, 100);
    expect([w.x, w.y]).toEqual([2, 2]);
    expect(isWalking(w)).toBe(false);
  });

  it("途中で新しい行き先を決めると、いまの向かうマスまで進んでから、新しい経路で行く(飛ばない)", () => {
    let w = walkTo(idleWalker(0, 0), [5, 0], open);
    w = stepWalker(w, 0.5); // 1.4マスくらい進んだ(1マス目をこえて、2マス目へ向かう)
    const before = { x: w.x, y: w.y };
    w = walkTo(w, [1, 4], open);
    expect(w.x).toBe(before.x);
    expect(w.y).toBe(before.y);
    w = stepWalker(w, 100);
    expect([w.x, w.y]).toEqual([1, 4]);
  });

  it("行けない行き先なら、いまのまま", () => {
    const w = idleWalker(1, 1);
    expect(walkTo(w, [9, 9], open)).toEqual(w);
  });

  it("立っているときは、動かない", () => {
    const w = idleWalker(2, 2);
    expect(stepWalker(w, 1)).toEqual(w);
  });
});

describe("歩く絵のコマ", () => {
  it("立っているとき・時間0のあとの4コマの繰り返し(1秒に8コマ)", () => {
    expect(walkFrame(0, false)).toBe("passing");
    const frames = [0, 0.13, 0.26, 0.39].map((t) => walkFrame(t, true));
    expect(new Set(frames).size).toBe(3); // 3種類のコマを使う(passing が2回)
    expect(walkFrame(0.5, true)).toBe(walkFrame(0, true));
  });
});

describe("歩ける場所", () => {
  const land: WorldLand = {
    width: 6,
    height: 4,
    plots: [
      { key: "town", name: "町", x: 0, y: 0, w: 4, h: 4, min_level: 1, ground: "grass", unlocked: true },
      { key: "bamboo", name: "竹林", x: 4, y: 0, w: 2, h: 4, min_level: 5, ground: "bamboo", unlocked: false },
    ],
    landmarks: [{ key: "spru_house", x: 1, y: 1, footprint: 2 }],
    paths: [[0, 3]],
    blocked: [],
    water: [[3, 3]],
    spru: { x: 0, y: 3 },
  };
  const items = [{ id: 1, x: 0, y: 0, footprint: 1 }];
  const companions = [{ x: 3, y: 0 }, { x: null, y: null }];
  const ok = walkableTiles(land, items, companions);

  it("草・道は歩ける。目印(家は4マス)・アイテム・仲間のいるマス・海・雲・地図の外は歩けない", () => {
    expect(ok(2, 0)).toBe(true);
    expect(ok(0, 3)).toBe(true); // 道
    for (const [x, y] of [[1, 1], [2, 2], [0, 0], [3, 0], [3, 3], [4, 1], [9, 9], [-1, 0]]) expect(ok(x, y)).toBe(false);
  });
});
