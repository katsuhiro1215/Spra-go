import { describe, expect, it } from "vitest";

import { DIFFICULTY_READINGS, difficultiesFor } from "./difficulty";

describe("難易度の並び", () => {
  it("返事に最高難易度がなければ、今まで通り3級だけ", () => {
    expect(difficultiesFor([{ difficulty: "初級" }, { difficulty: "中級" }])).toEqual(["初級", "中級", "上級"]);
    expect(difficultiesFor(null)).toEqual(["初級", "中級", "上級"]);
  });

  it("返事に最高難易度があれば、4つ目に足す", () => {
    expect(difficultiesFor([{ difficulty: "初級" }, { difficulty: "最高難易度" }])).toEqual(["初級", "中級", "上級", "最高難易度"]);
  });

  it("最高難易度に読みがある", () => {
    expect(DIFFICULTY_READINGS["最高難易度"]).toBe("さいこうなんいど");
  });
});
