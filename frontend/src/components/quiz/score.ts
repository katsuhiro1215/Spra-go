/** ステージの点数に入る問題か(docs/design/2026-09-29-spaced-review-design.md 5-1)。足したおさらいの問題は数えない */
export function countsTowardScore(question: { review?: boolean }): boolean {
  return !question.review;
}
