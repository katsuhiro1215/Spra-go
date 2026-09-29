// 学ぶタブの国旗のカードの計算(docs/design/2026-09-29-learn-flag-cards-design.md 5章)。画面を描かない部分だけをここに置く

/** 国ごとの進み具合(GET /api/countries の achievement)。問題のあるステージの数と、今のプレイヤーがクリアした数 */
export type Achievement = { cleared: number; total: number };

/** 学ぶタブで使う国(GET /api/countries のうち使う項目) */
export type LearnCountry = { id: number; code: string; name: string; locked: boolean; achievement: Achievement };

/** 「着いた国」と「まだの国」に分ける。段の中の順番はAPIの順(日本 → 旅の行き先)のまま */
export function learnSections<T extends { locked: boolean }>(countries: T[]): { arrived: T[]; notYet: T[] } {
  return {
    arrived: countries.filter((country) => !country.locked),
    notYet: countries.filter((country) => country.locked),
  };
}

/** ステージが1つ以上あり、全部クリアした */
export function isAllCleared({ cleared, total }: Achievement): boolean {
  return total > 0 && cleared >= total;
}

/** カードの数の文。「3/20」、全部クリアは「ぜんぶクリア！」、ステージがなければ null(数を出さない) */
export function achievementText(achievement: Achievement): string | null {
  if (achievement.total <= 0) return null;
  return isAllCleared(achievement) ? "ぜんぶクリア！" : `${achievement.cleared}/${achievement.total}`;
}

/** 進み具合の棒の割合(0〜1) */
export function achievementRatio({ cleared, total }: Achievement): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, cleared / total));
}

/** 着いた国のカードの読み上げの名前 */
export function countryCardLabel(name: string, achievement: Achievement): string {
  if (achievement.total <= 0) return name;
  return isAllCleared(achievement)
    ? `${name}、ぜんぶクリア`
    : `${name}、${achievement.total}ステージ中${achievement.cleared}クリア`;
}
