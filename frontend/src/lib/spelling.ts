// スペルを並べる形の、タイルを動かす決まり(docs/design/2026-10-09-review-variety-design.md 3-3)。画面を描かない部分だけをここに置く

export type SpellingTile = { id: number; letter: string };

/** サーバーが返した文字の並びに、番号を付ける(同じ文字でも別のタイル) */
export function tilesOf(letters: string[]): SpellingTile[] {
  return letters.map((letter, id) => ({ id, letter }));
}

/** タイルを、いちばん左の空いた枠に入れる。入れてあるタイル・枠がいっぱいのときは、そのまま */
export function placeTile(placed: number[], tileId: number, length: number): number[] {
  if (placed.includes(tileId) || placed.length >= length) return placed;
  return [...placed, tileId];
}

/** 入れた文字をもどす。あとの文字は左へつまる */
export function removeAt(placed: number[], slot: number): number[] {
  return slot < 0 || slot >= placed.length ? placed : placed.filter((_, index) => index !== slot);
}

export function clearAll(): number[] {
  return [];
}

export function canSubmit(placed: number[], length: number, state: { answered: boolean; submitting: boolean }): boolean {
  return placed.length === length && !state.answered && !state.submitting;
}

/** 入れた順の文字をつなげた答え */
export function answerOf(placed: number[], tiles: SpellingTile[]): string {
  return placed.map((id) => tiles[id]?.letter ?? "").join("");
}
