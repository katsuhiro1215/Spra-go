import type { CatchFinish, CatchStart } from "@/components/games/catch/catch-api";

/** スライドパズルのAPIの返事の形(docs/design/2026-10-09-slide-puzzle-design.md 3-1) */
export type PuzzleStart = CatchStart & { grid: [number, number] };

export type PuzzleFinish = CatchFinish & {
  /** パズルにかかった時間の合計(ミリ秒)と、自己ベスト */
  elapsed_ms: number | null;
  best_ms: number | null;
  new_best_time: boolean;
};

export type PuzzleAnswer = { question_id: number; choice_id: number };

export type PuzzleQuestion = PuzzleStart["questions"][number];

/** 正解の選択肢の絵(パズルの絵) */
export function pictureOf(question: PuzzleQuestion): string {
  return question.choices.find((choice) => choice.id === question.correct_choice_id)?.image ?? "";
}

/** 正解の名前 */
export function answerOf(question: PuzzleQuestion): string {
  return question.choices.find((choice) => choice.id === question.correct_choice_id)?.label ?? "";
}

/** まちがえた問題(絵と正解の名前)。答えていない問題は数えない */
export function missedOf(questions: PuzzleQuestion[], answers: PuzzleAnswer[]): { picture: string; name: string }[] {
  return questions
    .filter((question) => {
      const answer = answers.find((item) => item.question_id === question.id);
      return answer !== undefined && answer.choice_id !== question.correct_choice_id;
    })
    .map((question) => ({ picture: pictureOf(question), name: answerOf(question) }));
}
