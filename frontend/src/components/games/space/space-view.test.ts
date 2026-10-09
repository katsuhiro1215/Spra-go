import { describe, expect, it } from "vitest";

import { CATCH_MODES } from "@/components/games/catch/catch-view";

import { createSpaceGame } from "./space-engine";
import { DESTINATIONS, destinationLine, destinationName, gateLook, isVisible, itemFactor, missedQuestions, starsText } from "./space-view";

const questions = [
  { id: 1, prompt: "太陽に一番近い惑星は？", choices: [{ id: 11, label: "水星" }, { id: 12, label: "金星" }], correctChoiceId: 11 },
];
const base = createSpaceGame(questions, { lanes: 2, fallMs: 8000, obstacleRows: 2 }, 1);

describe("到着する星(設計書2章)", () => {
  it("サーバーが返すキーの名前が分かる", () => {
    expect(Object.keys(DESTINATIONS)).toEqual(["moon", "mars", "jupiter", "saturn", "neptune", "pluto"]);
    expect(destinationName("mars")).toBe("火星");
    expect(destinationLine("pluto")).toBe("ロケットが 冥王星 に たどりついたよ！");
  });

  it("知らないキーは「宇宙のはて」", () => {
    expect(destinationName("zzz")).toBe("宇宙のはて");
  });
});

describe("文言とモード", () => {
  it("星の数の表示", () => {
    expect(starsText(7)).toBe("★ 7");
  });

  it("スプルキャッチの選ぶ画面で使うモードが、うちゅう旅行のAPIを指す", () => {
    expect(CATCH_MODES.space_trip).toMatchObject({ title: "うちゅう旅行", apiPath: "/api/games/space-trip", emptyLink: false });
    expect(CATCH_MODES.space_trip.howTo).toHaveLength(3);
  });
});

describe("ものの位置", () => {
  it("着く時刻に着くと1、始まりより旅の長さだけ前は0", () => {
    expect(itemFactor(0.5, 0.5, 0.75)).toBe(1);
    expect(itemFactor(0.25, 1, 0.75)).toBeCloseTo(0, 5);
  });

  it("上から出る前・下へ出たあとは見えない", () => {
    expect(isVisible(-0.5)).toBe(false);
    expect(isVisible(0.5)).toBe(true);
    expect(isVisible(1.4)).toBe(false);
  });
});

describe("門の見た目", () => {
  it("進んでいる間は、すべて普通", () => {
    expect(gateLook(base, 0)).toBe("normal");
  });

  it("正解のとき: くぐった門は正解、ほかは薄く", () => {
    const state = { ...base, phase: "feedback" as const, gateLane: 0, lastCorrect: true };
    expect(gateLook(state, 0)).toBe("passed-correct");
    expect(gateLook(state, 1)).toBe("faded");
  });

  it("まちがえたとき: くぐった門はまちがい、正解の門を見せる", () => {
    const state = { ...base, phase: "feedback" as const, gateLane: 1, lastCorrect: false };
    expect(gateLook(state, 1)).toBe("passed-wrong");
    expect(gateLook(state, 0)).toBe("answer");
  });
});

describe("まちがえた問題", () => {
  it("まちがえた問題の問題文と正解を、答えた順に出す", () => {
    const state = { ...base, answers: [{ questionId: 1, choiceId: 12, correct: false, stars: 0 }] };
    expect(missedQuestions(state)).toEqual([{ focus: "太陽に一番近い惑星は？", rest: "", answer: "水星", answerImage: undefined }]);
  });

  it("正解した問題は出さない", () => {
    const state = { ...base, answers: [{ questionId: 1, choiceId: 11, correct: true, stars: 2 }] };
    expect(missedQuestions(state)).toEqual([]);
  });
});
