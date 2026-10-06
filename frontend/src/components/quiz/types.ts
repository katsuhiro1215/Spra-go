import type { MatchingItem } from "@/components/app/matching-question";
import type { SortingBasket } from "@/components/app/sorting-question";

export type QuizChoice = { id: number; label: string; meta?: { image?: string } | null };
export type QuizCountry = { id: number; code: string; name: string };
export type QuizQuestion = {
  id: number;
  type: "multiple_choice" | "matching" | "ordering" | "true_false" | "sorting";
  prompt: string;
  country: QuizCountry | null;
  choices: QuizChoice[];
  meta: {
    items?: MatchingItem[];
    baskets?: SortingBasket[];
    image?: string;
    layout?: "slots";
    /** ふりがなを付けない語(難読地名の問題の、問われる漢字) */
    plain?: string[];
  } | null;
  /** ステージに足した、出す日が来た前の問題(おさらい)。ステージの点数には入れない */
  review?: boolean;
};

/** 答えたあとに見せる解説(答えのAPIが返す)。どの項目も任意。docs/design/2026-10-06-question-explanation-design.md */
export type QuestionExplanation = {
  summary?: string;
  example?: { text: string; translation?: string };
  usage?: string;
  related?: { term: string; note?: string }[];
};
