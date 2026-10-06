/** ヘッダーのレベルの輪(docs/design/2026-10-07-header-level-design.md 3・5-1章) */

/** 今のレベルに届いた合計XP(floor)と、次のレベルの合計XP(next)。サーバーの level_xp */
export type LevelXp = { floor: number; next: number };

/** 輪の伸び(0〜1)。今のレベルに届いた直後が0、次のレベルに届く手前が1に近い。範囲がない・おかしいときは0 */
export function ringFraction(xp: number, range: LevelXp | undefined): number {
  if (!range || range.next <= range.floor) return 0;
  return Math.min(1, Math.max(0, (xp - range.floor) / (range.next - range.floor)));
}

/** SVGの輪の `stroke-dashoffset`。周の長さ(circumference)のうち、伸びた割合ぶんを見せる(0=全部、周の長さ=なし) */
export function ringOffset(circumference: number, fraction: number): number {
  return circumference * (1 - fraction);
}

/** 「あと 120 XP」。次のレベルまでの残り。届いたあと・範囲なしは null(出さない) */
export function xpToNextText(xp: number, range: LevelXp | undefined): string | null {
  if (!range || xp >= range.next) return null;
  return `あと ${(range.next - xp).toLocaleString()} XP`;
}

/** 輪の読み上げ用の文(例: 「レベル5。次のレベルまで、あと 120 XP」) */
export function levelLabel(level: number, range: LevelXp | undefined, xp: number): string {
  const next = xpToNextText(xp, range);
  return next ? `レベル${level}。次のレベルまで、${next}` : `レベル${level}`;
}
