import { describe, expect, it } from "vitest";

import { hasDetails, isBlankExplanation } from "./explanation";

describe("hasDetails", () => {
  it("要約だけなら、詳しく見る中身はない", () => {
    expect(hasDetails({ summary: "ありがとう" })).toBe(false);
  });

  it("例文・使いどころ・似た語のどれかがあれば、ある", () => {
    expect(hasDetails({ example: { text: "Thanks." } })).toBe(true);
    expect(hasDetails({ usage: "お礼を言うとき" })).toBe(true);
    expect(hasDetails({ related: [{ term: "Thank you." }] })).toBe(true);
  });

  it("空の似た語・解説なしは、ない", () => {
    expect(hasDetails({ related: [] })).toBe(false);
    expect(hasDetails(null)).toBe(false);
    expect(hasDetails(undefined)).toBe(false);
  });
});

describe("isBlankExplanation", () => {
  it("解説なし・中身が空なら、空", () => {
    expect(isBlankExplanation(null)).toBe(true);
    expect(isBlankExplanation({})).toBe(true);
    expect(isBlankExplanation({ related: [] })).toBe(true);
  });

  it("要約か詳しく見る中身があれば、空ではない", () => {
    expect(isBlankExplanation({ summary: "ありがとう" })).toBe(false);
    expect(isBlankExplanation({ usage: "お礼を言うとき" })).toBe(false);
  });
});
