import { describe, expect, it } from "vitest";

import { answerHeadline, choiceTone, difficultyBadge, skyInk, skyTextClass, stampBadge } from "./palette";

describe("空の上の文字の色", () => {
  it("夜だけ白、朝・昼・夕方はこげ茶", () => {
    expect(skyInk("morning")).toBe("ink");
    expect(skyInk("day")).toBe("ink");
    expect(skyInk("evening")).toBe("ink");
    expect(skyInk("night")).toBe("white");
  });

  it("昼は見出しも文字もこげ茶、補足は少し薄いこげ茶", () => {
    expect(skyTextClass("day", "title")).toBe("text-[#3b3226]");
    expect(skyTextClass("day", "text")).toBe("text-[#3b3226]");
    expect(skyTextClass("day", "muted")).toBe("text-[#4a3f30]");
  });

  it("夜は白。見出しには影を付ける", () => {
    expect(skyTextClass("night", "title")).toBe("text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]");
    expect(skyTextClass("night", "text")).toBe("text-white");
    expect(skyTextClass("night", "muted")).toBe("text-white/85");
  });
});

describe("選択肢のボタンの色", () => {
  it("答える前は白", () => {
    expect(choiceTone({ answered: false, isCorrect: true, isSelected: true })).toBe("default");
  });

  it("答えたあと、正解は明るい緑、選んだ不正解は朱色、ほかはベージュ", () => {
    expect(choiceTone({ answered: true, isCorrect: true, isSelected: false })).toBe("secondary");
    expect(choiceTone({ answered: true, isCorrect: true, isSelected: true })).toBe("secondary");
    expect(choiceTone({ answered: true, isCorrect: false, isSelected: true })).toBe("danger");
    expect(choiceTone({ answered: true, isCorrect: false, isSelected: false })).toBe("locked");
  });
});

describe("答えのあとの見出し", () => {
  it("正解は「せいかい！」、不正解は「おしい！」", () => {
    expect(answerHeadline(true)).toBe("せいかい！");
    expect(answerHeadline(false)).toBe("おしい！");
  });
});

describe("パスポートのスタンプのバッジ", () => {
  it("段位ごとに銅・銀・金のメダルと、今の文言を返す", () => {
    expect(stampBadge("bronze")).toEqual({ badge: "medal-bronze", ring: "border-[#c47a45]", label: "初級クリア" });
    expect(stampBadge("silver")).toEqual({ badge: "medal-silver", ring: "border-[#9aa3ab]", label: "中級までクリア" });
    expect(stampBadge("gold")).toEqual({ badge: "medal-gold", ring: "border-[#d4a72c]", label: "全難易度クリア" });
  });

  it("未訪問はバッジなし", () => {
    expect(stampBadge("none")).toEqual({ badge: null, ring: "border-[#e8dfcf]", label: "未訪問" });
  });
});

describe("難易度のバッジ", () => {
  it("初級・中級・上級は芽・つぼみ・花、ほかはなし", () => {
    expect(difficultyBadge("初級")).toBe("beginner");
    expect(difficultyBadge("中級")).toBe("intermediate");
    expect(difficultyBadge("上級")).toBe("advanced");
    expect(difficultyBadge("超級")).toBeNull();
  });
});
