import { describe, expect, it } from "vitest";

import { countsTowardScore } from "./score";

describe("ステージの点数に入る問題", () => {
  it("おさらいの問題は数えない。ふつうの問題は数える", () => {
    expect(countsTowardScore({ review: true })).toBe(false);
    expect(countsTowardScore({ review: false })).toBe(true);
    expect(countsTowardScore({})).toBe(true);
  });
});
