import { describe, expect, it } from "vitest";

import { answerOf, canSubmit, clearAll, placeTile, removeAt, tilesOf } from "./spelling";

describe("スペルを並べる(設計書3-3)", () => {
  const tiles = tilesOf(["p", "l", "a", "e", "p", "x", "t"]);

  it("タイルは、同じ文字でも別のタイルとして番号が付く", () => {
    expect(tiles.map((tile) => tile.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(tiles.filter((tile) => tile.letter === "p")).toHaveLength(2);
  });

  it("タイルを枠に入れていく。同じタイルは2回入らない・枠の数を超えて入らない", () => {
    let placed: number[] = [];
    placed = placeTile(placed, 2, 5);
    placed = placeTile(placed, 2, 5);
    expect(placed).toEqual([2]);
    for (const id of [0, 4, 1, 3, 5]) placed = placeTile(placed, id, 5);
    expect(placed).toEqual([2, 0, 4, 1, 3]);
  });

  it("入れた文字をタップすると、その文字だけもどり、あとの文字は左へつまる", () => {
    expect(removeAt([2, 0, 4], 1)).toEqual([2, 4]);
    expect(removeAt([2, 0, 4], 9)).toEqual([2, 0, 4]);
  });

  it("「けす」で全部もどる", () => {
    expect(clearAll()).toEqual([]);
  });

  it("全部の枠が埋まったときだけ「できた！」を押せる。答えている間・送信中は押せない", () => {
    expect(canSubmit([2, 0, 4, 1, 3], 5, { answered: false, submitting: false })).toBe(true);
    expect(canSubmit([2, 0], 5, { answered: false, submitting: false })).toBe(false);
    expect(canSubmit([2, 0, 4, 1, 3], 5, { answered: true, submitting: false })).toBe(false);
    expect(canSubmit([2, 0, 4, 1, 3], 5, { answered: false, submitting: true })).toBe(false);
  });

  it("入れた順に文字をつなげたものが、答え", () => {
    const apple = tilesOf(["a", "p", "p", "l", "e", "z"]);
    expect(answerOf([0, 1, 2, 3, 4], apple)).toBe("apple");
    expect(answerOf([4, 3], apple)).toBe("el");
  });
});
