// 連続プレイの節目(docs/design/2026-09-28-streak-milestones-design.md 4-2)

type StreakBadge = "streak-3" | "streak-7" | "streak-30";

const MILESTONE_BADGES: Record<number, StreakBadge> = {
  3: "streak-3",
  7: "streak-7",
  30: "streak-30",
};

/** 節目の日数から、mascot-11 の炎のバッジを選ぶ。節目でない日数は null */
export function streakMilestoneBadge(days: number): StreakBadge | null {
  return MILESTONE_BADGES[days] ?? null;
}

/** お祝いの一言。初めてはバッジをもらったこと、2回目からは続いたことをほめる */
export function streakMilestoneLine(days: number, first: boolean): string {
  return first ? "バッジをゲット！パスポートに入れたよ" : `また${days}日つづいたね！`;
}
