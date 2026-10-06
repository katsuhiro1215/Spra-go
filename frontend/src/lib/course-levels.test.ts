import { describe, expect, it } from "vitest";

import { groupsLevel, levelRatio, levelText } from "./course-levels";

describe("レベルの表示", () => {
  it("「Lv.30 / 30」の形", () => {
    expect(levelText(30, 30)).toBe("Lv.30 / 30");
    expect(levelText(0, 10)).toBe("Lv.0 / 10");
  });

  it("進み具合は 0〜1。最大が0のときは 0。最大を超えても 1", () => {
    expect(levelRatio(5, 10)).toBe(0.5);
    expect(levelRatio(0, 0)).toBe(0);
    expect(levelRatio(12, 10)).toBe(1);
  });

  it("級ごとのグループから、クリアしたステージの数と全部の数を数える", () => {
    const groups = [
      { stages: [{ cleared: true }, { cleared: true }, { cleared: false }] },
      { stages: [{ cleared: false }, { cleared: true }] },
    ];

    expect(groupsLevel(groups)).toEqual({ level: 3, max: 5 });
    expect(groupsLevel([])).toEqual({ level: 0, max: 0 });
  });
});
