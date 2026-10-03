import { cohortLevel, formatDay, formatRate, type AnalyticsData } from "@/lib/analytics";

const HEADS = ["登録した週", "1週後", "2週後", "3週後", "4週後"];

/**
 * 登録した週ごとの続き具合(docs/design/2026-10-03-analytics-design.md 6-1)。割合が高いほど濃い色で、
 * 色だけに頼らず、数字も出す。同じ色の一色の濃淡(順序のある数)
 */
export function CohortTable({ cohorts }: { cohorts: AnalyticsData["cohorts"] }) {
  if (cohorts.length === 0) {
    return <p className="text-sm text-muted-foreground">まだデータがありません。</p>;
  }

  return (
    <div className="viz-root overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">週</th>
            <th className="px-2 py-2 font-medium">人数</th>
            {HEADS.map((head) => (
              <th key={head} className="px-2 py-2 text-center font-medium">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.week} className="border-t border-border">
              <td className="px-4 py-1.5">{formatDay(cohort.week)}の週</td>
              <td className="px-2 py-1.5">{cohort.players}人</td>
              {cohort.weeks.map((rate, index) => {
                const level = cohortLevel(rate);
                return (
                  <td
                    key={index}
                    className="px-2 py-1.5 text-center font-medium"
                    style={level === 0 ? undefined : { background: `var(--seq-${level})`, color: `var(--seq-text-${level})` }}
                  >
                    {formatRate(rate)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
