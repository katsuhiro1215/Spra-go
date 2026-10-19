import { describe, expect, it } from "vitest";

import type { WorldLand } from "../types";
import {
  applyEdit,
  canDrawAt,
  canEraseAt,
  diffStroke,
  emptyHistory,
  recordEdit,
  redoEdit,
  strokeTiles,
  undoEdit,
  withCustomRoads,
  type Edit,
} from "./road-edit";

/** docs/design/2026-10-19-town-roads-design.md 3-1・5章 */

const land: WorldLand = {
  width: 8,
  height: 4,
  plots: [
    { key: "town", name: "はじまりの町", x: 0, y: 0, w: 4, h: 4, min_level: 1, ground: "grass", unlocked: true },
    { key: "bamboo", name: "竹林", x: 4, y: 0, w: 4, h: 4, min_level: 5, ground: "bamboo", unlocked: false },
  ],
  landmarks: [{ key: "torii", x: 3, y: 0 }],
  paths: [
    [0, 3],
    [1, 3],
    [2, 2], // 引いた道
  ],
  custom_paths: [[2, 2]],
  roads_max: 3,
  blocked: [
    [3, 0],
    [0, 3],
    [1, 3],
    [2, 2],
  ],
  water: [[3, 3]],
  spru: { x: 0, y: 3 },
};

const items = [{ id: 1, x: 1, y: 1, footprint: 1 }];

describe("道のなぞり方(4方向の階段)", () => {
  it("同じマスなら1マス", () => {
    expect(strokeTiles([2, 1], [2, 1])).toEqual([[2, 1]]);
  });

  it("横・縦にまっすぐ", () => {
    expect(strokeTiles([0, 0], [3, 0])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(strokeTiles([1, 3], [1, 0])).toEqual([[1, 3], [1, 2], [1, 1], [1, 0]]);
  });

  it("ななめは、階段(隣のマスだけでつながる)", () => {
    const tiles = strokeTiles([0, 0], [2, 2]);
    expect(tiles[0]).toEqual([0, 0]);
    expect(tiles.at(-1)).toEqual([2, 2]);
    for (let i = 1; i < tiles.length; i++) {
      expect(Math.abs(tiles[i][0] - tiles[i - 1][0]) + Math.abs(tiles[i][1] - tiles[i - 1][1])).toBe(1);
    }
  });
});

describe("引ける・消せる", () => {
  it("開いた区画の陸で、目印・道・アイテムのないマスだけ引ける", () => {
    expect(canDrawAt(land, items, 0, 0)).toBe(true);
    expect(canDrawAt(land, items, 3, 0)).toBe(false); // 目印
    expect(canDrawAt(land, items, 0, 3)).toBe(false); // もとの道
    expect(canDrawAt(land, items, 2, 2)).toBe(false); // 引いた道
    expect(canDrawAt(land, items, 1, 1)).toBe(false); // アイテム
    expect(canDrawAt(land, items, 3, 3)).toBe(false); // 海
    expect(canDrawAt(land, items, 5, 0)).toBe(false); // 雲
    expect(canDrawAt(land, items, 9, 9)).toBe(false); // 外
    expect(canDrawAt(land, items, -1, 0)).toBe(false);
  });

  it("消せるのは、自分が引いた道だけ", () => {
    expect(canEraseAt(land, 2, 2)).toBe(true);
    expect(canEraseAt(land, 0, 3)).toBe(false);
    expect(canEraseAt(land, 0, 0)).toBe(false);
  });
});

describe("1回の操作の差分", () => {
  it("ひく: 引けるマスだけ add(重なりなし)。引けないマスは捨てる", () => {
    const edit = diffStroke("draw", [[0, 0], [0, 0], [1, 1], [3, 0], [2, 1]], land, items);
    expect(edit.add).toEqual([[0, 0], [2, 1]]);
    expect(edit.remove).toEqual([]);
  });

  it("ひく: 上限をこえない分だけ(いま1つ、上限3なら、あと2つ)", () => {
    const edit = diffStroke("draw", [[0, 0], [0, 1], [0, 2]], land, items);
    expect(edit.add).toHaveLength(2);
  });

  it("けす: 自分の道だけ remove", () => {
    const edit = diffStroke("erase", [[2, 2], [0, 3], [0, 0]], land, items);
    expect(edit).toEqual({ add: [], remove: [[2, 2]] });
  });

  it("なにも変わらないときは、空の差分", () => {
    expect(diffStroke("draw", [[3, 0]], land, items)).toEqual({ add: [], remove: [] });
  });
});

describe("もどす・やりなおす", () => {
  const a: Edit = { add: [[0, 0]], remove: [] };
  const b: Edit = { add: [], remove: [[2, 2]] };

  it("記録すると、もどせる。もどすと逆の差分を返す。やりなおすと元の差分", () => {
    let h = recordEdit(emptyHistory(), a);
    h = recordEdit(h, b);
    const undone = undoEdit(h);
    expect(undone?.edit).toEqual({ add: [[2, 2]], remove: [] }); // bの逆
    const redone = redoEdit(undone!.history);
    expect(redone?.edit).toEqual(b);
  });

  it("空の差分は記録しない。新しく記録すると、やりなおしは消える", () => {
    expect(recordEdit(emptyHistory(), { add: [], remove: [] })).toEqual(emptyHistory());
    let h = recordEdit(emptyHistory(), a);
    h = undoEdit(h)!.history;
    h = recordEdit(h, b);
    expect(redoEdit(h)).toBeNull();
  });

  it("何もないときは null。20件までしか覚えない", () => {
    expect(undoEdit(emptyHistory())).toBeNull();
    expect(redoEdit(emptyHistory())).toBeNull();
    let h = emptyHistory();
    for (let i = 0; i < 25; i++) h = recordEdit(h, { add: [[i % 4, 0]], remove: [] });
    expect(h.past).toHaveLength(20);
  });
});

describe("道の一覧に当てる", () => {
  it("applyEdit: 消してから足す。重ねて足さない。順番は引いた順", () => {
    expect(applyEdit([[1, 1], [2, 2]], { add: [[3, 3], [1, 1]], remove: [[2, 2]] })).toEqual([[1, 1], [3, 3]]);
  });

  it("withCustomRoads: paths・blocked の引いた道だけを入れ替え、もとの道・目印は変えない", () => {
    const next = withCustomRoads(land, [[0, 0]]);
    expect(next.custom_paths).toEqual([[0, 0]]);
    expect(next.paths).toEqual([[0, 3], [1, 3], [0, 0]]);
    expect(next.blocked).toEqual([[3, 0], [0, 3], [1, 3], [0, 0]]);
    expect(land.custom_paths).toEqual([[2, 2]]); // 元は変えない
  });
});
