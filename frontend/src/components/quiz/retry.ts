import type { QuizQuestion } from "./types";

/** 並びを入れ替えた新しい配列(フィッシャー–イェーツ)。random は0以上1未満を返す関数 */
export function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 解いた直後のやり直しで出す問題(設計書3-7)。まちがえた問題だけを最初に出した順のまま、
 * 選択肢(と、仕分け・マッチングの絵)の順番を入れ替えて返す。問題そのものは変えない
 */
export function retryRound(questions: readonly QuizQuestion[], missedIds: readonly number[], random: () => number): QuizQuestion[] {
  return questions
    .filter((question) => missedIds.includes(question.id))
    .map((question) => ({
      ...question,
      choices: shuffled(question.choices, random),
      meta: question.meta?.items ? { ...question.meta, items: shuffled(question.meta.items, random) } : question.meta,
    }));
}
