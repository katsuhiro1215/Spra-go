import { describe, expect, it } from "vitest";

import { retryRound, shuffled } from "./retry";
import type { QuizQuestion } from "./types";

const question = (id: number, overrides: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  type: "multiple_choice",
  prompt: `問題${id}`,
  country: null,
  choices: [
    { id: id * 10 + 1, label: "ア" },
    { id: id * 10 + 2, label: "イ" },
    { id: id * 10 + 3, label: "ウ" },
  ],
  meta: null,
  ...overrides,
});

describe("shuffled", () => {
  it("元の並びを変えずに、入れ替えた新しい並びを返す", () => {
    const list = [1, 2, 3];
    // 常に0を返すと、後ろから順に先頭と入れ替わる
    expect(shuffled(list, () => 0)).toEqual([2, 3, 1]);
    expect(list).toEqual([1, 2, 3]);
  });

  it("中身は同じ", () => {
    expect(shuffled([1, 2, 3, 4], Math.random).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("retryRound", () => {
  it("まちがえた問題だけを、最初に出した順で返す", () => {
    const round = retryRound([question(1), question(2), question(3)], [3, 1], () => 0.999);
    expect(round.map((q) => q.id)).toEqual([1, 3]);
  });

  it("選択肢の順番を入れ替え、問題の中身は変えない", () => {
    const [q] = retryRound([question(1)], [1], () => 0);
    expect(q.choices.map((c) => c.label)).toEqual(["イ", "ウ", "ア"]);
    expect(q.prompt).toBe("問題1");
  });

  it("仕分け・マッチングの絵の順番も入れ替える", () => {
    const items = [
      { id: "jp", image: "/flag/jp.svg" },
      { id: "fr", image: "/flag/fr.svg" },
    ];
    const [q] = retryRound([question(1, { type: "sorting", choices: [], meta: { items, baskets: [] } })], [1], () => 0);
    expect(q.meta?.items?.map((item) => item.id)).toEqual(["fr", "jp"]);
    expect(q.meta?.baskets).toEqual([]);
  });

  it("まちがえた問題が無ければ空", () => {
    expect(retryRound([question(1)], [], Math.random)).toEqual([]);
  });
});
