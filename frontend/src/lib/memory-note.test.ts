import { describe, expect, it } from "vitest";

import { memoryNoteText } from "./memory-note";

describe("復習の一言(設計書5章)", () => {
  it("種類ごとの一言", () => {
    expect(memoryNoteText({ event: "mastered", days: null })).toBe("この問題を おぼえたよ！");
    expect(memoryNoteText({ event: "recovered", days: null })).toBe("前は まちがえたけど、今度は できたね！");
    expect(memoryNoteText({ event: "almost", days: null })).toBe("あと1回で マスター！");
    expect(memoryNoteText({ event: "returned", days: 5 })).toBe("5日ぶりに 正解！");
  });

  it("何もないときや、知らない種類は null", () => {
    expect(memoryNoteText(null)).toBeNull();
    expect(memoryNoteText(undefined)).toBeNull();
    expect(memoryNoteText({ event: "zzz", days: null })).toBeNull();
  });
});
