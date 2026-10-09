import { describe, expect, it } from "vitest";

import { distanceToSolved, formatTime, isSolved, MIN_DISTANCE, scramble, slide, solvedBoard, tilePosition } from "./slide-puzzle";

/** 乱数を決まった並びにする */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/** 盤が、完成形から合法な手で作れる(解ける)か。入れ替えの数と空きマスの行で判定する */
function isSolvable(board: number[], cols: number): boolean {
  const tiles = board.filter((tile) => tile !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inversions++;
  if (cols % 2 === 1) return inversions % 2 === 0;
  const rows = board.length / cols;
  const blankRowFromBottom = rows - Math.floor(board.indexOf(0) / cols);
  return (blankRowFromBottom % 2 === 0) === (inversions % 2 === 1);
}

describe("スライドパズル", () => {
  it("完成形は 1,2,…と並び、最後が空きマス(0)", () => {
    expect(solvedBoard(2, 2)).toEqual([1, 2, 3, 0]);
    expect(solvedBoard(3, 2)).toEqual([1, 2, 3, 4, 5, 0]);
    expect(isSolved([1, 2, 3, 0])).toBe(true);
    expect(isSolved([1, 3, 2, 0])).toBe(false);
  });

  it("並べ替えは、いつも解ける並びで、完成形と同じにならない(何度やっても)", () => {
    for (const [cols, rows] of [[2, 2], [3, 2], [2, 3], [3, 3]] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const board = scramble(cols, rows, seeded(seed));
        expect(board).toHaveLength(cols * rows);
        expect([...board].sort((a, b) => a - b)).toEqual([...solvedBoard(cols, rows)].sort((a, b) => a - b));
        expect(isSolved(board)).toBe(false);
        expect(isSolvable(board, cols)).toBe(true);
      }
    }
  });

  it("並べ替えは、簡単すぎない(ピースが元の場所から離れた合計が、盤の大きさごとの下限以上)", () => {
    expect(distanceToSolved([1, 2, 3, 0], 2)).toBe(0);
    expect(distanceToSolved([1, 2, 0, 3], 2)).toBe(1); // 3だけが1つ離れている
    expect(distanceToSolved([2, 1, 3, 0], 2)).toBe(2);
    for (const [cols, rows] of [[2, 2], [3, 2], [2, 3], [3, 3]] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        expect(distanceToSolved(scramble(cols, rows, seeded(seed)), cols)).toBeGreaterThanOrEqual(MIN_DISTANCE[`${cols}x${rows}`]);
      }
    }
  });

  it("空きマスの隣のピースをタップすると、そこへ滑る", () => {
    // 1 2 3
    // 4 5 0
    const board = [1, 2, 3, 4, 5, 0];
    expect(slide(board, 3, 5)).toBeNull(); // 空きマス自身は動かせない
    expect(slide(board, 3, 2)).toEqual([1, 2, 0, 4, 5, 3]); // 上のピースが下へ
    expect(slide(board, 3, 4)).toEqual([1, 2, 3, 4, 0, 5]); // 左のピースが右へ
    expect(slide(board, 3, 0)).toBeNull(); // 空きマスと同じ行・列でない
  });

  it("同じ行・列のピースは、まとめて滑る", () => {
    // 1 2 3
    // 4 5 0
    // 7 8 6
    const board = [1, 2, 3, 4, 5, 0, 7, 8, 6];
    expect(slide(board, 3, 3)).toEqual([1, 2, 3, 0, 4, 5, 7, 8, 6]); // 同じ行: 4・5 が右へ
    expect(slide(board, 3, 2)).toEqual([1, 2, 0, 4, 5, 3, 7, 8, 6]);
    expect(slide(board, 3, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]); // 下のピースが上へ
    const column = [1, 0, 3, 4, 2, 6, 7, 5, 8]; // 空きマスは2列目の上
    expect(slide(column, 3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]); // 同じ列: 2・5 が上へ
  });

  it("ピースの位置(絵のどこを切り出すか)", () => {
    // 3列2行の盤で、ピース5(2行目の2列目)は、列1・行1
    expect(tilePosition(5, 3, 2)).toEqual({ col: 1, row: 1 });
    expect(tilePosition(1, 3, 2)).toEqual({ col: 0, row: 0 });
    expect(tilePosition(3, 3, 2)).toEqual({ col: 2, row: 0 });
  });

  it("時間は「分:秒」(1分未満は「◯.◯秒」)", () => {
    expect(formatTime(0)).toBe("0.0秒");
    expect(formatTime(4321)).toBe("4.3秒");
    expect(formatTime(59999)).toBe("59.9秒");
    expect(formatTime(60000)).toBe("1:00");
    expect(formatTime(125000)).toBe("2:05");
  });
});
