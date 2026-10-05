// 都道府県クイズの画面の判定(docs/design/2026-10-05-prefecture-quiz-design.md 7章)。画面を描かない部分だけをここに置く

export const PREFECTURE_ROOT_NAME = "都道府県クイズ";

/** 県のコースのカードに出すバッジの様子。バッジがなければ none、もらったら earned(カラー)、まだなら locked(白黒で薄く) */
export function courseBadgeState(course: { badge?: string | null; earned?: boolean }): "none" | "earned" | "locked" {
  if (!course.badge) return "none";
  return course.earned ? "earned" : "locked";
}

/** コースのカードの種類。地方(さらにコースを持つ)・県(バッジあり)・それ以外(地方まるごと、国旗クイズの大陸) */
export function courseCardKind(course: { group?: boolean; badge?: string | null }): "region" | "prefecture" | "plain" {
  if (course.group) return "region";
  if (course.badge) return "prefecture";
  return "plain";
}

/** コースの選択の副題。都道府県クイズの大もと＝地方、その下の地方＝県、国旗クイズ＝大陸 */
export function courseSelectPrompt(category: { name: string }, hasParent: boolean): string {
  if (category.name === PREFECTURE_ROOT_NAME) return "どの地方にする？";
  if (hasParent) return "どの県にする？";
  return "どの大陸にする？";
}
