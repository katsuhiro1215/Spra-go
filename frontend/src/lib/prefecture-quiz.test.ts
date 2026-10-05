import { describe, expect, it } from "vitest";

import { PREFECTURE_ROOT_NAME, courseBadgeState, courseCardKind, courseSelectPrompt } from "./prefecture-quiz";

describe("都道府県クイズのコースのカード", () => {
  it("バッジのある県のコース: もらったらカラー(earned)、まだなら白黒(locked)。バッジのないコースは none", () => {
    expect(courseBadgeState({ badge: "/badge/pref/osaka.webp", earned: true })).toBe("earned");
    expect(courseBadgeState({ badge: "/badge/pref/osaka.webp", earned: false })).toBe("locked");
    expect(courseBadgeState({ badge: "/badge/pref/osaka.webp" })).toBe("locked");
    expect(courseBadgeState({ badge: null, earned: false })).toBe("none");
    expect(courseBadgeState({})).toBe("none");
    // バッジがなければ、称号をもらっていても none(地方まるごと・国旗のコース)
    expect(courseBadgeState({ badge: null, earned: true })).toBe("none");
  });

  it("カードの種類: 地方(group)・県(バッジあり)・それ以外(まるごと・国旗のコース)", () => {
    expect(courseCardKind({ group: true, badge: null })).toBe("region");
    expect(courseCardKind({ group: false, badge: "/badge/pref/osaka.webp" })).toBe("prefecture");
    expect(courseCardKind({ group: false, badge: null })).toBe("plain");
    expect(courseCardKind({})).toBe("plain");
  });
});

describe("コースの選択の副題", () => {
  it("都道府県クイズの大もとは「どの地方」、その下の地方は「どの県」、国旗クイズは「どの大陸」", () => {
    expect(courseSelectPrompt({ name: PREFECTURE_ROOT_NAME }, false)).toBe("どの地方にする？");
    expect(courseSelectPrompt({ name: "近畿" }, true)).toBe("どの県にする？");
    expect(courseSelectPrompt({ name: "国旗クイズ" }, false)).toBe("どの大陸にする？");
  });
});
