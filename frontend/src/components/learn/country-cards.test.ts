import { describe, expect, it } from "vitest";

import { achievementRatio, achievementText, countryCardLabel, isAllCleared, learnSections } from "./country-cards";

describe("学ぶタブの国旗のカード(設計書 2026-09-29-learn-flag-cards 3・5章)", () => {
  it("着いた国とまだの国に分け、段の中はAPIの順のまま", () => {
    const countries = [
      { code: "jp", locked: false },
      { code: "id", locked: true },
      { code: "us", locked: false },
      { code: "kr", locked: true },
    ];
    const { arrived, notYet } = learnSections(countries);
    expect(arrived.map((country) => country.code)).toEqual(["jp", "us"]);
    expect(notYet.map((country) => country.code)).toEqual(["id", "kr"]);
  });

  it("まだの国がなければ、まだの国は空", () => {
    expect(learnSections([{ code: "jp", locked: false }]).notYet).toEqual([]);
  });

  it("全部クリアは、ステージが1つ以上あって全部クリアしたときだけ", () => {
    expect(isAllCleared({ cleared: 20, total: 20 })).toBe(true);
    expect(isAllCleared({ cleared: 3, total: 20 })).toBe(false);
    expect(isAllCleared({ cleared: 0, total: 0 })).toBe(false);
  });

  it("数の文は 3/20・0/20、全部クリアは「ぜんぶクリア！」、ステージがなければ null", () => {
    expect(achievementText({ cleared: 3, total: 20 })).toBe("3/20");
    expect(achievementText({ cleared: 0, total: 20 })).toBe("0/20");
    expect(achievementText({ cleared: 20, total: 20 })).toBe("ぜんぶクリア！");
    expect(achievementText({ cleared: 0, total: 0 })).toBeNull();
  });

  it("棒の割合は0〜1(ステージがなければ0、超えても1)", () => {
    expect(achievementRatio({ cleared: 3, total: 20 })).toBeCloseTo(0.15);
    expect(achievementRatio({ cleared: 0, total: 20 })).toBe(0);
    expect(achievementRatio({ cleared: 0, total: 0 })).toBe(0);
    expect(achievementRatio({ cleared: 25, total: 20 })).toBe(1);
  });

  it("読み上げの名前は「日本、20ステージ中3クリア」、全部クリアは「日本、ぜんぶクリア」、ステージがなければ国名だけ", () => {
    expect(countryCardLabel("日本", { cleared: 3, total: 20 })).toBe("日本、20ステージ中3クリア");
    expect(countryCardLabel("日本", { cleared: 20, total: 20 })).toBe("日本、ぜんぶクリア");
    expect(countryCardLabel("日本", { cleared: 0, total: 0 })).toBe("日本");
  });
});
