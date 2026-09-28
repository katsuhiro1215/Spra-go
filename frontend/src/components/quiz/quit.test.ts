import { describe, expect, it } from "vitest";

import { quizQuitTarget } from "./quit";

describe("クイズをやめたときの戻り先", () => {
  it("1つ前の画面があれば戻る", () => {
    expect(quizQuitTarget(2)).toBe("back");
    expect(quizQuitTarget(5)).toBe("back");
  });

  it("クイズのURLを直接開いたとき(1つ前が無い)は「学ぶ」へ", () => {
    expect(quizQuitTarget(1)).toBe("/learn");
    expect(quizQuitTarget(0)).toBe("/learn");
  });
});
