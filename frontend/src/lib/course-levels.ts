// 国レベル・言語レベルの表示の計算(docs/design/2026-10-07-main-game-levels-design.md 4-5)。画面を描かない部分だけをここに置く

export type CourseLevel = { level: number; max: number };

/** GET /api/passport の country_levels の1件 */
export type CountryLevel = CourseLevel & { code: string; name: string };

/** GET /api/passport の language_levels の1件 */
export type LanguageLevel = CourseLevel & { key: string; name: string };

/** 「Lv.30 / 30」 */
export function levelText(level: number, max: number): string {
  return `Lv.${level} / ${max}`;
}

/** 進み具合(0〜1)。最大が0のときは0 */
export function levelRatio(level: number, max: number): number {
  return max > 0 ? Math.min(1, level / max) : 0;
}

/** 級ごとのグループ(ステージの cleared つき)から、レベル(クリアしたステージの数)と最大(全部の数) */
export function groupsLevel(groups: { stages: { cleared: boolean }[] }[]): CourseLevel {
  const stages = groups.flatMap((group) => group.stages);
  return { level: stages.filter((stage) => stage.cleared).length, max: stages.length };
}
