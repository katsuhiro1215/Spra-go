import type { MatchingItem } from "@/components/app/matching-question";
import type { SortingBasket } from "@/components/app/sorting-question";

export type QuizChoice = { id: number; label: string };
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
  } | null;
};
