import { splitPrompt } from "@/components/games/game-question";
import { GARDEN_IMAGES, SPRU_BLOOM, type SpruImage } from "@/components/spru/spru-assets";

import type { CatchState, GrowthStage } from "./catch-engine";

/** スプルキャッチの見た目の計算(docs/design/2026-09-29-spru-catch-design.md 7章) */
export const CATCH_LOCKED_MESSAGE = "アメリカかイギリスに着くと遊べるよ";

export function rewardLeftText(left: number): string {
  return left > 0 ? `今日のごほうび あと${left}回` : "今日のごほうびはおしまい。練習はいつでもできるよ";
}

export function laneLabel(lanes: number): string {
  return `${lanes}択`;
}

export function rewardLines(reward: { xp: number; point: number } | null): string[] {
  return reward ? [`経験値 +${reward.xp}`, `学習ポイント +${reward.point}`] : [];
}

/** 問題文の大きく見せる所の文字の大きさ。長いほど小さく */
export function focusSizeClass(focus: string): string {
  const length = [...focus].length;
  if (length <= 10) return "text-4xl";
  if (length <= 20) return "text-2xl";
  return "text-lg";
}

/** 落ちてくる言葉の文字の大きさ。列が多いほど小さく */
export function laneTextClass(lanes: number): string {
  if (lanes <= 2) return "text-xl";
  if (lanes === 3) return "text-lg";
  return "text-base";
}

export type CardLook = "normal" | "caught-correct" | "caught-wrong" | "answer" | "faded";

/** ○×を見せている間の、列ごとのカードの見た目 */
export function cardLook(state: CatchState, lane: number): CardLook {
  if (state.phase !== "feedback") return "normal";
  if (lane === state.caughtLane) return state.lastCorrect ? "caught-correct" : "caught-wrong";
  const question = state.questions[state.index];
  if (!state.lastCorrect && question.choices[lane]?.id === question.correctChoiceId) return "answer";
  return "faded";
}

export function growthImage(stage: GrowthStage): SpruImage {
  const images: Record<GrowthStage, SpruImage> = {
    seed: GARDEN_IMAGES.seed,
    sprout: GARDEN_IMAGES.sprout,
    bud: SPRU_BLOOM.bud,
    flower: SPRU_BLOOM.flower,
  };
  return images[stage];
}

/** まちがえた問題の「」の中と正解の言葉(答えた順) */
export function missedWords(state: CatchState): { focus: string; answer: string }[] {
  return state.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = state.questions.find((q) => q.id === answer.questionId);
      if (!question) return { focus: "", answer: "" };
      return {
        focus: splitPrompt(question.prompt).focus,
        answer: question.choices.find((choice) => choice.id === question.correctChoiceId)?.label ?? "",
      };
    });
}
