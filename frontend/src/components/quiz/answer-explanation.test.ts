import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnswerExplanation } from "./answer-explanation";

function html(props: Parameters<typeof AnswerExplanation>[0]): string {
  return renderToStaticMarkup(createElement(AnswerExplanation, props));
}

describe("AnswerExplanation", () => {
  it("解説なし・空なら、何も出さない", () => {
    expect(html({ explanation: null })).toBe("");
    expect(html({ explanation: {} })).toBe("");
  });

  it("要約が出る。詳しく見る中身がなければ、ボタンは出ない", () => {
    const out = html({ explanation: { summary: "ジンギスカンは北海道の名物だよ。" } });

    expect(out).toContain("ジンギスカンは");
    expect(out).not.toContain("くわしく見る");
  });

  it("詳しく見る中身があれば、ボタンが出る。開く前は、中身は出ない", () => {
    const out = html({
      explanation: { summary: "ありがとう", example: { text: "Thank you very much.", translation: "どうもありがとうございます。" } },
    });

    expect(out).toContain("くわしく見る");
    expect(out).toContain('aria-expanded="false"');
    expect(out).not.toContain("Thank you very much.");
  });

  it("要約がなく中身だけでも、ボタンが出る", () => {
    expect(html({ explanation: { usage: "お礼を言うとき" } })).toContain("くわしく見る");
  });

  it("plain の語には、ふりがなを付けない（難読地名の問われた漢字）", () => {
    const text = "北海道の『むろらん』だよ。";

    expect(html({ explanation: { summary: text } })).toContain("<ruby"); // 辞書にある語は、ふつうはふりがなが付く
    expect(html({ explanation: { summary: text }, plain: ["北海道"] })).not.toContain("<ruby");
  });
});
