import { describe, expect, it } from "vitest";

import { splitPrompt } from "./game-question";

describe("問題文の分け方", () => {
  it("「」で始まる文は、「」の中を大きく見せる所にし、残りを小さく見せる所にする", () => {
    expect(splitPrompt("「Hello」の意味は？")).toEqual({ focus: "Hello", rest: "の意味は？" });
  });

  it("文法の文も同じ分け方にする", () => {
    expect(splitPrompt("「The man ___ is my uncle.」空欄に入る最も適切な関係代名詞は？")).toEqual({
      focus: "The man ___ is my uncle.",
      rest: "空欄に入る最も適切な関係代名詞は？",
    });
  });

  it("「」で始まらない文は、そのまま大きく見せる", () => {
    expect(splitPrompt("7を表す英単語は？")).toEqual({ focus: "7を表す英単語は？", rest: "" });
  });
});
