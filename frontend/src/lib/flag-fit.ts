// 国旗のはめ込み(番号の枠に、下の国旗をタップで入れる。docs/design/2026-10-05-flag-quiz-design.md 7-2)。画面を描かない部分だけをここに置く

/** はめ込みの項目。国旗は絵(image)、都道府県クイズの県庁所在地は文字(text) */
export type FitItem = { id: string; image?: string; text?: string };
export type FitChoice = { id: number; label: string };
export type FitResult = { item_id: string; correct: boolean; correct_choice_id: number };

/** 枠の番号の印 */
export const SLOT_MARKS = ["①", "②", "③", "④"] as const;

/** 枠の中身。入れた国旗の番号(item.id)、空なら null */
export function emptySlots(count: number): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

/** 国旗を、いちばん上の空いている枠に入れる。入っている国旗・全部埋まっているときは、そのまま返す */
export function placeFlag(slots: (string | null)[], itemId: string): (string | null)[] {
  if (slots.includes(itemId)) return slots;
  const index = slots.indexOf(null);
  if (index < 0) return slots;
  return slots.map((slot, i) => (i === index ? itemId : slot));
}

/** 入れた国旗を取り出して、枠を空ける */
export function removeFlag(slots: (string | null)[], itemId: string): (string | null)[] {
  return slots.map((slot) => (slot === itemId ? null : slot));
}

export function slotsFull(slots: (string | null)[]): boolean {
  return slots.every((slot) => slot !== null);
}

/** 答え合わせに送る組。枠の番号の順の選択肢と、入れた国旗。全部入っていなければ空 */
export function slotAnswers(slots: (string | null)[], choices: FitChoice[]): { item_id: string; choice_id: number }[] {
  if (!slotsFull(slots)) return [];
  return slots.map((itemId, index) => ({ item_id: itemId as string, choice_id: choices[index].id }));
}

/** 下に並べる国旗(まだ枠に入れていないもの) */
export function unplacedItems<T extends { id: string }>(items: T[], slots: (string | null)[]): T[] {
  return items.filter((item) => !slots.includes(item.id));
}

/** 番号から決まる並べ替え(同じ番号なら同じ並び)。もとの配列は変えない */
export function seededOrder<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = (seed >>> 0) || 1;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 答え合わせの結果から、その選択肢(枠)の正しい国旗の番号を引く */
export function correctItemId(results: FitResult[] | null, choiceId: number): string | null {
  return results?.find((result) => result.correct_choice_id === choiceId)?.item_id ?? null;
}
