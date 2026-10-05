import { describe, expect, it } from "vitest";

import { decalAt, decalOffset, pathEdges, patternMatrix, plotPoints } from "./ground";

describe("地面の絵の変形(設計書 2026-10-05-town-blend 3-1)", () => {
  it("4×4マスをおおう絵(512px)を、菱形に変形する行列", () => {
    expect(patternMatrix(512)).toBe("matrix(0.25 0.125 -0.25 0.125 0 0)");
  });

  it("絵の大きさが違っても、4×4マスをおおう(1024pxなら行列は半分)", () => {
    expect(patternMatrix(1024)).toBe("matrix(0.125 0.0625 -0.125 0.0625 0 0)");
  });
});

describe("区画の菱形", () => {
  it("7×7の区画は、上・右・下・左の順の1つの大きな菱形", () => {
    expect(plotPoints({ x: 0, y: 0, w: 7, h: 7 })).toBe("0,0 224,112 0,224 -224,112");
  });

  it("手前に並ぶ区画は、その分ずれる(海辺: x0 y7 w7 h5)", () => {
    expect(plotPoints({ x: 0, y: 7, w: 7, h: 5 })).toBe("-224,112 0,224 -160,304 -384,192");
  });
});

describe("小物の位置は座標から決まる", () => {
  it("同じ座標なら、いつも同じ結果", () => {
    for (const [x, y] of [[0, 0], [3, 5], [11, 11]]) {
      expect(decalAt(x, y, 6)).toBe(decalAt(x, y, 6));
      expect(decalOffset(x, y)).toEqual(decalOffset(x, y));
    }
  });

  it("48×48のうち、12〜18%のマスに出て、番号は範囲内(12×12でも、極端に偏らない)", () => {
    let count = 0;
    let small = 0;
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const kind = decalAt(x, y, 6);
        if (kind === null) continue;
        count++;
        if (x < 12 && y < 12) small++;
        expect(kind).toBeGreaterThanOrEqual(0);
        expect(kind).toBeLessThan(6);
      }
    }
    expect(count / 2304).toBeGreaterThanOrEqual(0.12);
    expect(count / 2304).toBeLessThanOrEqual(0.18);
    expect(small / 144).toBeGreaterThanOrEqual(0.08);
    expect(small / 144).toBeLessThanOrEqual(0.25);
  });

  it("小物の種類が0なら、どこにも出ない", () => {
    expect(decalAt(2, 2, 0)).toBeNull();
  });

  it("ずれは、±12・±5の範囲内", () => {
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const { dx, dy } = decalOffset(x, y);
        expect(Math.abs(dx)).toBeLessThanOrEqual(12);
        expect(Math.abs(dy)).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe("道のふち(道が草地に接する辺だけ)", () => {
  const open = () => true;

  it("1マスだけの道は、4辺ぜんぶにふちが付く", () => {
    expect(pathEdges([[2, 2]], open)).toHaveLength(4);
  });

  it("2マスが隣り合う道は、間の辺にはふちが付かない(8辺のうち6辺)", () => {
    expect(pathEdges([[2, 2], [3, 2]], open)).toHaveLength(6);
  });

  it("地図の外・閉じた区画に接する辺には、ふちを付けない", () => {
    const onlyThis = (x: number, y: number) => x === 2 && y === 2;
    expect(pathEdges([[2, 2]], onlyThis)).toHaveLength(0);
  });

  it("線は、マスの辺の2つの角を結ぶ(例: (0,0)の奥の辺は上の角から右の角)", () => {
    const edges = pathEdges([[0, 0]], (x, y) => x === 0 && y === -1);
    expect(edges).toEqual(["M0,0 L32,16"]);
  });
});
