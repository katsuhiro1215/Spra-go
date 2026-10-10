import type { GameChoice, GameQuestion } from "@/components/games/game-question";

import type { CatchDifficulty, CatchFinish } from "../catch/catch-api";
import type { SpaceMapResult } from "./space-map-api";

/** うちゅう旅行のAPIの返事の形(docs/design/2026-10-09-space-trip-design.md 6章)。選ぶ画面の返事は、スプルキャッチと同じ */
export type SpaceStart = {
  play_id: number;
  difficulty: CatchDifficulty;
  lanes: number;
  fall_ms: number;
  obstacle_rows: number;
  questions: { id: number; prompt: string; choices: GameChoice[]; correct_choice_id: number }[];
};

/** map は、地図の星から始めた回だけ付く */
export type SpaceFinish = CatchFinish & { stars: number; destination: string; map?: SpaceMapResult };

export function toGameQuestions(start: SpaceStart): GameQuestion[] {
  return start.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceId: question.correct_choice_id,
  }));
}
