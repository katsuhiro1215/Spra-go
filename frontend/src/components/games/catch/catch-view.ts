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

export type CatchMode = "catch" | "flag_catch" | "space_trip" | "puzzle_flag" | "puzzle_space";

/** ゲームの種類ごとの設定(docs/design/2026-10-05-flag-catch-design.md 6章)。英語は今までの文のまま */
export const CATCH_MODES: Record<
  CatchMode,
  {
    title: string;
    intro: string;
    howTo: readonly string[];
    apiPath: string;
    missedHeading: string;
    emptyMessage: string;
    /** 遊べないときに「せかいへ」のボタンを出すか(英語は旅の鍵があるので出す) */
    emptyLink: boolean;
  }
> = {
  catch: {
    title: CATCH_TITLE,
    intro: "落ちてくる答えを、スプルでキャッチしよう",
    howTo: CATCH_HOW_TO,
    apiPath: "/api/games/catch",
    missedHeading: "まちがえた言葉",
    emptyMessage: CATCH_LOCKED_MESSAGE,
    emptyLink: true,
  },
  flag_catch: {
    title: "スプルキャッチ（こっき）",
    intro: "流れてくる国旗を、スプルでキャッチしよう",
    howTo: ["「国名」の国旗が上に出るよ", "流れてくる国旗をタップ！スプルが種を投げてキャッチするよ", "10問やってみよう。ハートは3つ"],
    apiPath: "/api/games/flag-catch",
    missedHeading: "まちがえた国旗",
    emptyMessage: "国旗の問題はじゅんびちゅうだよ",
    emptyLink: false,
  },
  space_trip: {
    title: "うちゅう旅行",
    intro: "ロケットに乗って、隕石をよけて、答えの門をくぐろう",
    howTo: ["問題が上に出るよ", "◀▶でロケットを動かして、隕石をよけながら星を集めよう。答えの門をくぐると答えが決まるよ", "10問やってみよう。ハートは3つ"],
    apiPath: "/api/games/space-trip",
    missedHeading: "まちがえた問題",
    emptyMessage: "宇宙の問題はじゅんびちゅうだよ",
    emptyLink: false,
  },
  puzzle_flag: {
    title: "スライドパズル（こっき）",
    intro: "バラバラの国旗を、スライドさせて完成させよう",
    howTo: ["空いているところの となりのピースをタップすると、すべるよ", "国旗が完成したら、「これはなんでしょう」に答えてね", "3まいやってみよう。かかった時間も記録されるよ"],
    apiPath: "/api/games/puzzle-flag",
    missedHeading: "まちがえた国旗",
    emptyMessage: "国旗の問題はじゅんびちゅうだよ",
    emptyLink: false,
  },
  puzzle_space: {
    title: "スライドパズル（うちゅう）",
    intro: "バラバラの宇宙の絵を、スライドさせて完成させよう",
    howTo: ["空いているところの となりのピースをタップすると、すべるよ", "絵が完成したら、「これはなんでしょう」に答えてね", "3まいやってみよう。かかった時間も記録されるよ"],
    apiPath: "/api/games/puzzle-space",
    missedHeading: "まちがえた絵",
    emptyMessage: "宇宙の絵はじゅんびちゅうだよ",
    emptyLink: false,
  },
};

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

/** まちがえた問題の「」の中と正解の言葉(答えた順)。正解の選択肢に国旗の絵があれば、answerImage に入れる */
export function missedWords(state: CatchState): { focus: string; answer: string; answerImage?: string }[] {
  return state.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = state.questions.find((q) => q.id === answer.questionId);
      if (!question) return { focus: "", answer: "" };
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId);
      return {
        focus: splitPrompt(question.prompt).focus,
        answer: correct?.label ?? "",
        answerImage: correct?.image ?? undefined,
      };
    });
}
