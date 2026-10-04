import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";
import { GROWTH_IMAGES, SPRU_BLOOM } from "@/components/spru/spru-assets";

import { createCatchGame, throwAt, tick, type CatchState } from "./catch-engine";
import {
  CATCH_HOW_TO,
  CATCH_MOVE_HINT,
  CATCH_TAP_HINT,
  CATCH_TITLE,
  cardLook,
  focusSizeClass,
  growthImage,
  laneLabel,
  laneTextClass,
  missedWords,
  rewardLeftText,
  rewardLines,
  spruPose,
} from "./catch-view";

function question(id: number, labels: string[], correctLane = 0, prompt = `「word${id}」の意味は？`): GameQuestion {
  const choices = labels.map((label, lane) => ({ id: id * 10 + lane, label }));
  return { id, prompt, choices, correctChoiceId: choices[correctLane].id };
}

function caughtAt(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "falling") next = tick(next, 100);
  return next;
}

describe("文", () => {
  it("今日のごほうびの残り", () => {
    expect(rewardLeftText(2)).toBe("今日のごほうび あと2回");
    expect(rewardLeftText(0)).toBe("今日のごほうびはおしまい。練習はいつでもできるよ");
  });

  it("列の数", () => {
    expect(laneLabel(3)).toBe("3択");
  });

  it("ごほうびの行。ない回は空", () => {
    expect(rewardLines({ xp: 24, point: 18 })).toEqual(["経験値 +24", "学習ポイント +18"]);
    expect(rewardLines(null)).toEqual([]);
  });
});

describe("文字の大きさ", () => {
  it("大きく見せる所は、短いほど大きい", () => {
    expect(focusSizeClass("Hello")).toBe("text-4xl");
    expect(focusSizeClass("a".repeat(10))).toBe("text-4xl");
    expect(focusSizeClass("a".repeat(11))).toBe("text-2xl");
    expect(focusSizeClass("a".repeat(20))).toBe("text-2xl");
    expect(focusSizeClass("a".repeat(21))).toBe("text-lg");
  });

  it("落ちてくる言葉は、列が多いほど小さい", () => {
    expect([laneTextClass(2), laneTextClass(3), laneTextClass(4)]).toEqual(["text-xl", "text-lg", "text-base"]);
  });
});

describe("落ちてくる言葉のカードの見た目", () => {
  const settings = { lanes: 3, fallMs: 1000 };

  it("落ちている間は、どれもふつう", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], settings);
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["normal", "normal", "normal"]);
  });

  it("正解を受け取ったら、その列ははずみ、ほかはうすくなる", () => {
    const state = caughtAt(createCatchGame([question(1, ["a", "b", "c"], 1)], settings));
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["faded", "caught-correct", "faded"]);
  });

  it("まちがいを受け取ったら、その列はゆれ、正解の列を光らせる", () => {
    const state = caughtAt(createCatchGame([question(1, ["a", "b", "c"], 2)], settings));
    expect([0, 1, 2].map((lane) => cardLook(state, lane))).toEqual(["faded", "caught-wrong", "answer"]);
  });
});

describe("成長の印の絵", () => {
  it("種・芽は畑の絵、つぼみ・花はスプルの頭の絵", () => {
    expect(growthImage("seed")).toBe(GROWTH_IMAGES["spru/seed"]);
    expect(growthImage("sprout")).toBe(GROWTH_IMAGES["spru/sprout"]);
    expect(growthImage("bud")).toBe(SPRU_BLOOM.bud);
    expect(growthImage("flower")).toBe(SPRU_BLOOM.flower);
  });
});

describe("まちがえた言葉", () => {
  it("まちがえた問題の「」の中と、正解の言葉を、答えた順に出す", () => {
    let state = createCatchGame(
      [question(1, ["赤", "青"], 1, "「blue」の意味は？"), question(2, ["seven", "six"], 0, "7を表す英単語は？")],
      { lanes: 2, fallMs: 1000 },
    );
    state = caughtAt(state); // 1問目: 左(赤)を受け取る → まちがい
    while (state.phase === "feedback") state = tick(state, 100);
    state = caughtAt(state); // 2問目: 左(seven)を受け取る → 正解
    expect(missedWords(state)).toEqual([{ focus: "blue", answer: "青" }]);
  });
});

describe("spruPose", () => {
  const questions = [1, 2].map((id) => question(id, ["正", "誤"]));
  const settings = { lanes: 2, fallMs: 1000 };

  it("落ちている間は、後ろ姿(back)", () => {
    expect(spruPose(createCatchGame(questions, settings))).toBe("back");
  });

  it("種を投げた直後の300msは、投げる絵(throw)。そのあとは、正解なら cheer・まちがいなら sad", () => {
    const right = throwAt(createCatchGame(questions, settings), 0);
    expect(spruPose(right)).toBe("throw"); // 800ms 残り(正解の○×は800ms)
    expect(spruPose(tick(right, 100))).toBe("throw"); // 700ms 残り
    expect(spruPose(tick(tick(right, 100), 100))).toBe("throw"); // 600ms 残り
    expect(spruPose(tick(tick(tick(right, 100), 100), 100))).toBe("cheer"); // 500ms 残り(300ms たったので、喜びに変わる)

    const wrong = throwAt(createCatchGame(questions, settings), 1);
    expect(spruPose(wrong)).toBe("throw");
    let later = wrong;
    for (let i = 0; i < 4; i++) later = tick(later, 100); // 1600 → 1200ms 残り
    expect(spruPose(later)).toBe("sad");
  });

  it("受け取る線で決まったときは、投げる絵にならず、すぐ cheer か sad", () => {
    const state = caughtAt(createCatchGame(questions, settings));

    expect(spruPose(state)).toBe(state.lastCorrect ? "cheer" : "sad");
  });
});

describe("説明の文", () => {
  it("名前は「スプルキャッチ（えいたんご）」、あそびかたは3つの手順、ヒントは2つ", () => {
    expect(CATCH_TITLE).toBe("スプルキャッチ（えいたんご）");
    expect(CATCH_HOW_TO).toHaveLength(3);
    expect(CATCH_HOW_TO.every((line) => line.length > 0)).toBe(true);
    expect(CATCH_TAP_HINT).toBe("答えをタップ！");
    expect(CATCH_MOVE_HINT).toContain("◀▶");
  });
});
