import type { GameChoice, GameQuestion } from "@/components/games/game-question";

/** スプルキャッチのAPIの返事の形(docs/design/2026-09-29-spru-catch-design.md 6-3) */
export type CatchDifficulty = "初級" | "中級" | "上級";

export type CatchSummary = {
  category_id: number | null;
  difficulties: {
    difficulty: CatchDifficulty;
    lanes: number;
    available: number;
    best_score: number | null;
    /** スライドパズルだけ: 盤の大きさ [列, 行] と、自己ベストの時間(ミリ秒) */
    grid?: [number, number];
    best_ms?: number | null;
  }[];
  rewarded_plays_left: number;
  /** 今週のミニゲーム(ごほうびが1.5倍) */
  featured?: boolean;
};

export type CatchStart = {
  play_id: number;
  difficulty: CatchDifficulty;
  lanes: number;
  fall_ms: number;
  questions: { id: number; prompt: string; choices: GameChoice[]; correct_choice_id: number }[];
};

export type CatchFinish = {
  answered_count: number;
  correct_count: number;
  score: number;
  best_combo: number;
  best_score: number;
  new_best: boolean;
  reward: { xp: number; point: number } | null;
  rewarded_plays_left: number;
  leveled_up: boolean;
  previous_level: number;
  level: number;
};

export function toGameQuestions(start: CatchStart): GameQuestion[] {
  return start.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceId: question.correct_choice_id,
  }));
}
