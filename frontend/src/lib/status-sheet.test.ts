import { describe, expect, it } from "vitest";

import { topLevels } from "./status-sheet";

describe("国レベル・言語レベルの上位", () => {
  const rows = [
    { key: "jp", name: "日本", level: 12, max: 30 },
    { key: "us", name: "アメリカ", level: 30, max: 30 },
    { key: "fr", name: "フランス", level: 0, max: 30 },
    { key: "gb", name: "イギリス", level: 12, max: 30 },
    { key: "kr", name: "韓国", level: 3, max: 30 },
  ];

  it("レベルの多い順に、上位3つ。0のものは出さない", () => {
    expect(topLevels(rows, 3).map((row) => row.key)).toEqual(["us", "jp", "gb"]);
  });

  it("同じレベルは、元の並びのまま", () => {
    expect(topLevels(rows, 4).map((row) => row.key)).toEqual(["us", "jp", "gb", "kr"]);
  });

  it("3つに満たないときは、ある分だけ。ないときは空", () => {
    expect(topLevels(rows.slice(2, 3), 3)).toEqual([]);
    expect(topLevels([rows[1]], 3)).toHaveLength(1);
    expect(topLevels([], 3)).toEqual([]);
  });

  it("元の配列を変えない", () => {
    const copy = [...rows];
    topLevels(rows, 3);
    expect(rows).toEqual(copy);
  });
});
