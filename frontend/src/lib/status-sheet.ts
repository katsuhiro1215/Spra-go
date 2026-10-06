/** 「じぶんの状態」パネルの計算(docs/design/2026-10-07-header-level-design.md 4章)。画面を描かない部分だけをここに置く */

/** 国レベル・言語レベルの上位 n 件。レベルの多い順(同じなら元の並び)、0のものは出さない。元の配列は変えない */
export function topLevels<T extends { level: number }>(rows: T[], n: number): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.level > 0)
    .sort((a, b) => b.row.level - a.row.level || a.index - b.index)
    .slice(0, n)
    .map(({ row }) => row);
}
