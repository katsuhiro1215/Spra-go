import { splitPrompt } from "@/components/games/game-question";

import type { SpaceState } from "./space-engine";

/** うちゅう旅行の見た目の計算(docs/design/2026-10-09-space-trip-design.md 4・7章)。画面を描かない部分だけをここに置く */

/** 到着する星(サーバーの config/games.php の space_trip.destinations と同じキー) */
export const DESTINATIONS: Record<string, { name: string; color: string }> = {
  moon: { name: "月", color: "#e8e4d4" },
  mars: { name: "火星", color: "#cf6a45" },
  jupiter: { name: "木星", color: "#dba76d" },
  saturn: { name: "土星", color: "#e4cf90" },
  neptune: { name: "海王星", color: "#3f6fd0" },
  pluto: { name: "冥王星", color: "#b9a99a" },
};

export function destinationName(key: string): string {
  return DESTINATIONS[key]?.name ?? "宇宙のはて";
}

export function destinationLine(key: string): string {
  return `ロケットが ${destinationName(key)} に たどりついたよ！`;
}

export const SPACE_MOVE_HINT = "◀▶でロケットを動かそう";

/** 集めた星の表示 */
export function starsText(count: number): string {
  return `★ ${count}`;
}

/**
 * ものの位置(アリーナの高さの割合の係数)。1で「ロケットの上に着いた」位置、0でいちばん上。
 * 時刻 at のものは、進み progress のとき 1 + (progress − at) / travel
 */
export function itemFactor(progress: number, at: number, travel: number): number {
  return 1 + (progress - at) / travel;
}

/** 画面に見える範囲か(上から出る前・下へ出たあとは描かない) */
export function isVisible(factor: number): boolean {
  return factor > -0.15 && factor < 1.25;
}

export type GateLook = "normal" | "passed-correct" | "passed-wrong" | "answer" | "faded";

/** ○×を見せている間の、列ごとの門の見た目 */
export function gateLook(state: SpaceState, lane: number): GateLook {
  if (state.phase !== "feedback") return "normal";
  if (lane === state.gateLane) return state.lastCorrect ? "passed-correct" : "passed-wrong";
  const question = state.questions[state.index];
  if (!state.lastCorrect && question.choices[lane]?.id === question.correctChoiceId) return "answer";
  return "faded";
}

/** まちがえた問題の問題文と、正解の言葉(答えた順)。正解に絵があれば answerImage に入れる */
export function missedQuestions(state: SpaceState): { focus: string; rest: string; answer: string; answerImage?: string }[] {
  return state.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = state.questions.find((q) => q.id === answer.questionId);
      if (!question) return { focus: "", rest: "", answer: "" };
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId);
      const { focus, rest } = splitPrompt(question.prompt);
      return { focus, rest, answer: correct?.label ?? "", answerImage: correct?.image ?? undefined };
    });
}
