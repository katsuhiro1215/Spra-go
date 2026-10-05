import type { QuestionExplanation } from "./types";

/** 「くわしく見る」で開く中身(例文・使いどころ・似た語)があるか */
export function hasDetails(explanation: QuestionExplanation | null | undefined): boolean {
  if (!explanation) return false;
  return Boolean(explanation.example?.text) || Boolean(explanation.usage) || (explanation.related?.length ?? 0) > 0;
}

/** カードに出すものが何もないか(解説なしの問題は、解説の欄そのものを出さない) */
export function isBlankExplanation(explanation: QuestionExplanation | null | undefined): boolean {
  return !explanation || (!explanation.summary && !hasDetails(explanation));
}
