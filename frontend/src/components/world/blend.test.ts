import { describe, expect, it } from "vitest";

import { BLEND_BONUS, BLEND_MAX, blendBonus, blendCells, blendGroups, type BlendItem } from "./blend";

const tree = (id: number, x: number | null, y: number | null, key = "tree"): BlendItem => ({ id, asset_key: key, x, y, footprint: 1 });
const flower = (id: number, x: number, y: number, key = "tulip"): BlendItem => ({ id, asset_key: key, x, y, footprint: 1 });

describe("林・花畑のまとまり(設計書 2026-10-05-town-blend 4章)", () => {
  it("木が3本、隣り合うと、林が1つ", () => {
    const groups = blendGroups([tree(1, 2, 2), tree(2, 3, 2), tree(3, 4, 2)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("grove");
    expect(groups[0].itemIds.sort()).toEqual([1, 2, 3]);
  });

  it("木が2本だけなら、まとまりにならない", () => {
    expect(blendGroups([tree(1, 2, 2), tree(2, 3, 2)])).toEqual([]);
  });

  it("3本でも、離れていれば(間が1マス以上あくと)つながらない", () => {
    expect(blendGroups([tree(1, 0, 0), tree(2, 1, 0), tree(3, 4, 0)])).toEqual([]);
  });

  it("斜めに隣り合っていても、つながる", () => {
    expect(blendGroups([tree(1, 0, 0), tree(2, 1, 1), tree(3, 2, 2)])).toHaveLength(1);
  });

  it("大きな木(2×2)は1本だが、4マスで隣の木とつながる", () => {
    const big: BlendItem = { id: 1, asset_key: "large_tree", x: 2, y: 2, footprint: 2 };
    const groups = blendGroups([big, tree(2, 4, 2), tree(3, 4, 3, "pine")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(6);
  });

  it("木と花は別々に数える(木3つと花3つは、林1つと花畑1つ。混ざった3つは、どちらにもならない)", () => {
    const items = [tree(1, 0, 0), tree(2, 1, 0), tree(3, 2, 0), flower(4, 0, 5), flower(5, 1, 5, "sunflower"), flower(6, 2, 5, "flowerbed")];
    expect(blendGroups(items).map((g) => g.kind).sort()).toEqual(["grove", "meadow"]);
    expect(blendGroups([tree(1, 0, 0), flower(2, 1, 0), tree(3, 2, 0)])).toEqual([]);
  });

  it("置いていない(x が null)アイテムと、木・花でないアイテムは数えない", () => {
    const bench: BlendItem = { id: 9, asset_key: "bench", x: 1, y: 1, footprint: 1 };
    expect(blendGroups([tree(1, 0, 0), tree(2, 1, 0), tree(3, null, null), bench])).toEqual([]);
  });

  it("変わるマス: まとまりのマスと周囲1マス。道・ほかのアイテムのマスと、地図の外は除く", () => {
    const [group] = blendGroups([tree(1, 2, 2), tree(2, 3, 2), tree(3, 4, 2)]);
    const all = blendCells(group, new Set(), () => true);
    expect(all).toHaveLength(15); // 横5×縦3
    const limited = blendCells(group, new Set(["2,1"]), (x, y) => y >= 1 && x >= 1 && x <= 5 && y <= 3);
    expect(limited).toHaveLength(14);
    expect(limited.some(([x, y]) => x === 2 && y === 1)).toBe(false);
  });

  it("にぎやか度の加点: まとまり1つ+4、最大3つまで", () => {
    const g = (n: number) => Array.from({ length: n }, () => ({ kind: "grove" as const, itemIds: [], cells: [] }));
    expect([0, 1, 2, 3, 4].map((n) => blendBonus(g(n)))).toEqual([0, BLEND_BONUS, BLEND_BONUS * 2, BLEND_BONUS * BLEND_MAX, BLEND_BONUS * BLEND_MAX]);
    expect(BLEND_BONUS).toBe(4);
    expect(BLEND_MAX).toBe(3);
  });
});
