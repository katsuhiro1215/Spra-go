import { describe, expect, it } from "vitest";

import { toGameQuestions } from "./catch-api";

describe("始めるAPIの返事を問題の形にする", () => {
  it("correct_choice_id を correctChoiceId にする", () => {
    const questions = toGameQuestions({
      play_id: 1,
      difficulty: "初級",
      lanes: 2,
      fall_ms: 8000,
      questions: [{ id: 5, prompt: "「red」の意味は？", choices: [{ id: 50, label: "赤" }, { id: 51, label: "青" }], correct_choice_id: 50 }],
    });
    expect(questions).toEqual([{ id: 5, prompt: "「red」の意味は？", choices: [{ id: 50, label: "赤" }, { id: 51, label: "青" }], correctChoiceId: 50 }]);
  });
});

it("選択肢の国旗の絵(image)を、そのまま問題に渡す", () => {
  const questions = toGameQuestions({
    play_id: 1,
    difficulty: "初級",
    lanes: 2,
    fall_ms: 8000,
    questions: [
      {
        id: 5,
        prompt: "「日本」の国旗は？",
        choices: [
          { id: 1, label: "日本", image: "/flag/Japan.svg" },
          { id: 2, label: "韓国", image: "/flag/Korea-South.svg" },
        ],
        correct_choice_id: 1,
      },
    ],
  });

  expect(questions[0].choices[0].image).toBe("/flag/Japan.svg");
});
