import { describe, expect, it } from "vitest";

import {
  hasContext,
  loadWordList,
  meaningLines,
  nextWordId,
  saveWordList,
  starsText,
  statusAfterToggle,
  type WordDetail,
} from "./words";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe("重要度の★", () => {
  it("3段階。多いほど重要", () => {
    expect(starsText(3)).toBe("★★★");
    expect(starsText(2)).toBe("★★☆");
    expect(starsText(1)).toBe("★☆☆");
  });

  it("範囲の外は、1〜3に丸める", () => {
    expect(starsText(0)).toBe("★☆☆");
    expect(starsText(9)).toBe("★★★");
  });
});

describe("意味の行", () => {
  it("品詞ごとに1行。意味は「、」でつなぐ", () => {
    expect(
      meaningLines([
        { pos: "名", ja: ["理由", "根拠", "理性"] },
        { pos: "動", ja: ["論理的に考える"] },
      ]),
    ).toEqual([
      { label: "【名】", text: "理由、根拠、理性" },
      { label: "【動】", text: "論理的に考える" },
    ]);
  });

  it("意味のない品詞の行は出さない", () => {
    expect(meaningLines([{ pos: "名", ja: [] }])).toEqual([]);
  });
});

describe("次の語", () => {
  it("一覧の並びで、次の語の番号を返す。最後は null", () => {
    expect(nextWordId([5, 7, 9], 5)).toBe(7);
    expect(nextWordId([5, 7, 9], 7)).toBe(9);
    expect(nextWordId([5, 7, 9], 9)).toBeNull();
  });

  it("一覧にない語・空の一覧は null", () => {
    expect(nextWordId([5, 7, 9], 4)).toBeNull();
    expect(nextWordId([], 4)).toBeNull();
  });
});

describe("一覧の並びの保存", () => {
  it("保存した番号の列を、そのまま読み出せる", () => {
    const storage = memoryStorage();
    saveWordList([3, 1, 2], storage);
    expect(loadWordList(storage)).toEqual([3, 1, 2]);
  });

  it("保存がない・こわれているときは、空の列", () => {
    expect(loadWordList(memoryStorage())).toEqual([]);
    const broken = memoryStorage();
    broken.setItem("spra:word-list", "{not json");
    expect(loadWordList(broken)).toEqual([]);
    broken.setItem("spra:word-list", '["a", 2]');
    expect(loadWordList(broken)).toEqual([]);
  });

  it("保存できない端末(例外)でも、落ちない", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveWordList([1], throwing)).not.toThrow();
    expect(loadWordList(throwing)).toEqual([]);
  });
});

describe("苦手・覚えたのボタン", () => {
  it("同じボタンをもう一度押すと外れる。別のボタンなら入れ替わる", () => {
    expect(statusAfterToggle(null, "weak")).toBe("weak");
    expect(statusAfterToggle("weak", "weak")).toBeNull();
    expect(statusAfterToggle("weak", "learned")).toBe("learned");
    expect(statusAfterToggle("learned", "weak")).toBe("weak");
  });
});

describe("内容のある項目", () => {
  const base: WordDetail = {
    id: 1,
    word: "reason",
    level: 61,
    pos: "名",
    cefr: null,
    importance: 2,
    ipa: null,
    meanings: [{ pos: "名", ja: ["理由"] }],
    usage: null,
    examples: [],
    synonyms: [],
    status: null,
    saved: false,
  };

  it("空の項目は、ないものとして扱う(見出しごと出さない)", () => {
    expect(hasContext(base)).toBe(false);
    expect(hasContext({ ...base, usage: "   " })).toBe(false);
    expect(hasContext({ ...base, usage: "理由を言うとき。" })).toBe(true);
  });
});
