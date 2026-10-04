import { splitPrompt } from "@/components/games/game-question";
import { GROWTH_IMAGES, SPRU_BLOOM, type SpruImage } from "@/components/spru/spru-assets";

import { FEEDBACK_MS, THROW_POSE_MS, type CatchState, type GrowthStage } from "./catch-engine";

/** スプルキャッチの見た目の計算(docs/design/2026-09-29-spru-catch-design.md 7章) */
export const CATCH_LOCKED_MESSAGE = "アメリカかイギリスに着くと遊べるよ";

export const CATCH_TITLE = "スプルキャッチ（えいたんご）";

/** 難しさを選ぶ画面の「あそびかた」(docs/design/2026-10-04-mini-app-tidy-design.md 4-3) */
export const CATCH_HOW_TO = [
  "問題が上に出るよ",
  "答えの言葉をタップ！スプルが種を投げてキャッチするよ",
  "10問やってみよう。ハートは3つ",
] as const;

export const CATCH_TAP_HINT = "答えをタップ！";
export const CATCH_MOVE_HINT = "◀▶でスプルを動かしても取れるよ";

export type SpruPose = "back" | "throw" | "cheer" | "sad";

/** スプルの絵の決まり。落ちている間は後ろ姿。種を投げた直後の少しの間は投げる絵。そのあとは正解なら喜び・まちがいならがっかり */
export function spruPose(state: CatchState): SpruPose {
  if (state.phase !== "feedback") return "back";
  if (state.lastVia === "throw") {
    const total = state.lastCorrect ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong;
    if (state.feedbackMs > total - THROW_POSE_MS) return "throw";
  }
  return state.lastCorrect ? "cheer" : "sad";
}

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
    seed: GROWTH_IMAGES["spru/seed"],
    sprout: GROWTH_IMAGES["spru/sprout"],
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
