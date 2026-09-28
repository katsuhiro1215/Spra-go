/** クイズをやめたときの戻り先(設計書4-2)。1つ前の画面があれば戻り、URLを直接開いたときは「学ぶ」へ */
export function quizQuitTarget(historyLength: number): "back" | "/learn" {
  return historyLength > 1 ? "back" : "/learn";
}
