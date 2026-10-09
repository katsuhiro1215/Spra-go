import { describe, expect, it } from "vitest";

import { HALF_H, HALF_W } from "./iso";
import { decalAt, decalOffset, pathEdges, patternMatrix, plotPoints, roadMarks } from "./ground";

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

describe("道のしるし(中心線と横断歩道。設計書 2026-10-09-road-look 3章)", () => {
  const all = () => true;

  it("1マスだけの道には、しるしを付けない", () => {
    expect(roadMarks([[2, 2]], all)).toEqual({ center: [], crossings: [] });
  });

  it("まっすぐな3マスは、中心線が2本で、横断歩道はない", () => {
    const marks = roadMarks([[2, 2], [3, 2], [4, 2]], all);
    expect(marks.center).toHaveLength(2);
    expect(marks.crossings).toHaveLength(0);
  });

  it("T字の交差点は、3方向の手前に横断歩道が付き、交差点のマスの真ん中には線が来ない", () => {
    const tee = [[3, 3], [2, 3], [4, 3], [3, 4]] as [number, number][];
    const marks = roadMarks(tee, all);
    expect(marks.crossings).toHaveLength(3);
    // 交差点(3,3)のマスの中心。中心線は、そこを通らない
    const junction = `${(3 - 3) * HALF_W},${(3 + 3 + 1) * HALF_H}`;
    for (const d of marks.center) expect(d).not.toContain(junction);
    expect(marks.center).toHaveLength(3);
  });

  it("十字の交差点は、4方向に横断歩道が付く", () => {
    const cross = [[3, 3], [2, 3], [4, 3], [3, 2], [3, 4]] as [number, number][];
    expect(roadMarks(cross, all).crossings).toHaveLength(4);
  });

  it("閉じた区画のマスは、しるしの数に入れない", () => {
    const onlyFirst = (x: number) => x === 2;
    expect(roadMarks([[2, 2], [3, 2]], onlyFirst)).toEqual({ center: [], crossings: [] });
  });
});
