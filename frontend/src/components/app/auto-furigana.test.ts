import { describe, expect, it } from "vitest";

import { tokenize } from "./auto-furigana";

// ふりがなを付ける語だけを「語(読み)」の形で並べる
const ruby = (text: string) =>
  tokenize(text)
    .filter((segment) => typeof segment !== "string")
    .map((segment) => `${segment.text}(${segment.reading})`);

describe("自動ふりがな(旅の画面の言葉)", () => {
  it("1文字の読みで誤らないよう、言葉ごとの読みを使う", () => {
    expect(ruby("出発する")).toEqual(["出発(しゅっぱつ)"]);
    expect(ruby("小さな船")).toEqual(["小さな(ちいさな)", "船(ふね)"]);
    expect(ruby("大きな船")).toEqual(["大きな(おおきな)", "船(ふね)"]);
    expect(ruby("自転車")).toEqual(["自転車(じてんしゃ)"]);
    expect(ruby("仏国寺")).toEqual(["仏国寺(ぶっこくじ)"]);
    expect(ruby("もっと学ぶ(中級・上級)")).toEqual(["中級(ちゅうきゅう)", "上級(じょうきゅう)"]);
    expect(ruby("インドネシアの初級のボスをクリアしよう")).toEqual(["初級(しょきゅう)"]);
  });

  it("「〜中」は「ちゅう」と読む", () => {
    expect(ruby("じゅんび中")).toEqual(["じゅんび中(じゅんびちゅう)"]);
    expect(ruby("出発中...")).toEqual(["出発中(しゅっぱつちゅう)"]);
    expect(ruby("受け取り中...")).toEqual(["受け取り中(うけとりちゅう)"]);
    expect(ruby("読み込み中...")).toEqual(["読み込み中(よみこみちゅう)"]);
  });

  it("「受け取る」は「うけと」と読む", () => {
    expect(ruby("受け取る")).toEqual(["受け取(うけと)"]);
  });
});
