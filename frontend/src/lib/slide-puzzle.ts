// スライドパズルの、画面を描かない部分(docs/design/2026-10-09-slide-puzzle-design.md 3-2)。
// 盤は、左上から右へ・下へ並べた数の並び。1〜(列×行−1)がピース、0が空きマス。完成形は 1,2,…,0

export type Board = number[];

export function solvedBoard(cols: number, rows: number): Board {
  return [...Array.from({ length: cols * rows - 1 }, (_, i) => i + 1), 0];
}

export function isSolved(board: Board): boolean {
  return board.every((tile, index) => tile === (index === board.length - 1 ? 0 : index + 1));
}

/** 空きマスの隣(上下左右)の場所の番号 */
function neighbours(index: number, cols: number, rows: number): number[] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return [
    row > 0 ? index - cols : -1,
    row < rows - 1 ? index + cols : -1,
    col > 0 ? index - 1 : -1,
    col < cols - 1 ? index + 1 : -1,
  ].filter((i) => i >= 0);
}

/** 各ピースが、元の場所から何マス離れているか(縦横の差)の合計。空きマスは数えない */
export function distanceToSolved(board: Board, cols: number): number {
  return board.reduce((sum, tile, index) => {
    if (tile === 0) return sum;
    const home = tile - 1;
    return sum + Math.abs((home % cols) - (index % cols)) + Math.abs(Math.floor(home / cols) - Math.floor(index / cols));
  }, 0);
}

/** 並べ替えの下限(盤の大きさごと)。これより簡単な並びは、手を足してずらす */
export const MIN_DISTANCE: Record<string, number> = { "2x2": 3, "3x2": 5, "2x3": 5, "3x3": 8 };

/**
 * 完成形から、合法な手(空きマスの隣のピースを動かす)をランダムに重ねて並べる。必ず解ける。
 * すぐ戻る手は使わない。完成形に近すぎるとき(MIN_DISTANCE より小さいとき)は、手を足して、ずらす。rng は 0以上1未満の乱数(テスト用に差し替えられる)
 */
export function scramble(cols: number, rows: number, rng: () => number = Math.random): Board {
  const board = solvedBoard(cols, rows);
  let blank = board.length - 1;
  let previous = -1;
  const moves = cols * rows * 12;

  const minimum = MIN_DISTANCE[`${cols}x${rows}`] ?? 2;
  for (let step = 0; step < moves || distanceToSolved(board, cols) < minimum; step++) {
    const options = neighbours(blank, cols, rows).filter((i) => i !== previous);
    const target = options[Math.floor(rng() * options.length)];
    [board[blank], board[target]] = [board[target], board[blank]];
    previous = blank;
    blank = target;
  }

  return board;
}

/**
 * index のピースをタップしたときの、動いたあとの盤。空きマスと同じ行・列にあれば、間のピースもまとめて空きマスの方へ滑る。
 * 動かせない(空きマス自身・同じ行も列でもない)ときは null
 */
export function slide(board: Board, cols: number, index: number): Board | null {
  const blank = board.indexOf(0);
  if (index === blank) return null;

  const sameRow = Math.floor(index / cols) === Math.floor(blank / cols);
  const sameCol = index % cols === blank % cols;
  if (!sameRow && !sameCol) return null;

  const step = sameRow ? (index < blank ? 1 : -1) : index < blank ? cols : -cols;
  const next = [...board];
  // 空きマスから、タップしたピースへ向かって、1つずつ空きマスを動かす
  for (let at = blank; at !== index; at -= step) {
    next[at] = next[at - step];
  }
  next[index] = 0;

  return next;
}

/** ピース(1〜)が、完成した絵の、どの列・行の部分か */
export function tilePosition(tile: number, cols: number, rows: number): { col: number; row: number } {
  void rows;
  return { col: (tile - 1) % cols, row: Math.floor((tile - 1) / cols) };
}

/** かかった時間の表示。1分未満は「4.3秒」、それ以上は「2:05」 */
export function formatTime(ms: number): string {
  if (ms < 60000) return `${(Math.floor(ms / 100) / 10).toFixed(1)}秒`;
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
