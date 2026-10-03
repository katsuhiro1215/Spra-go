// 分析のページの計算(docs/design/2026-10-03-analytics-design.md 6章)。画面を描かない部分だけをここに置く

export type DailyRow = {
  date: string;
  new_accounts: number;
  new_players: number;
  active_players: number;
  opened_players: number;
  answers: number;
  correct_answers: number;
  accuracy: number | null;
  play_minutes: number;
};

export type AnalyticsData = {
  days: number;
  summary: {
    accounts: number;
    players: number;
    active_today: number;
    active_7d: number;
    active_30d: number;
    answers_today: number;
    play_minutes_today: number;
  };
  daily: DailyRow[];
  retention: Record<"d1" | "d3" | "d7", { rate: number | null; base: number }>;
  cohorts: { week: string; players: number; weeks: (number | null)[] }[];
  funnel: { key: string; label: string; count: number; rate: number | null }[];
  dropoff: { key: string; label: string; count: number }[];
  hard_questions: { question_id: number; prompt: string; answers: number; accuracy: number; reports: number }[];
  activities: { key: string; label: string; players: number; count: number | null }[];
  feedback: { new: number; read: number; done: number };
};

export const PERIODS = [7, 14, 30, 90] as const;

const EMPTY = "—";

/** 0〜1の割合を、整数の%にする。null(母数が0)は「—」 */
export function formatRate(rate: number | null): string {
  return rate === null ? EMPTY : `${Math.round(rate * 100)}%`;
}

/** 数は桁区切り。null(回数を持たない遊び)は「—」 */
export function formatCount(value: number | null): string {
  return value === null ? EMPTY : value.toLocaleString("en-US");
}

/** 60分未満は「分」、以上は「時間分」 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
}

/** Y-m-d を「月/日」にする(0を付けない) */
export function formatDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 登録した週ごとの表の、色の濃さの段階(0: データなし、1〜4: 割合が高いほど濃い) */
export function cohortLevel(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null) return 0;
  if (rate >= 0.75) return 4;
  if (rate >= 0.5) return 3;
  if (rate >= 0.25) return 2;
  return 1;
}

/** CSVの保存名 */
export function exportFileName(kind: string, today: string): string {
  return `spra-analytics-${kind}-${today}.csv`;
}
