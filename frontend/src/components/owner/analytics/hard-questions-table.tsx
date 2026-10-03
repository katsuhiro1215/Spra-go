import { formatCount, formatRate, type AnalyticsData } from "@/lib/analytics";

/** まちがいの多い問題(docs/design/2026-10-03-analytics-design.md 6-1)。全期間で、5回以上答えられた問題 */
export function HardQuestionsTable({ rows }: { rows: AnalyticsData["hard_questions"] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">5回以上答えられた問題が、まだありません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">問題</th>
            <th className="px-2 py-2 font-medium">回答数</th>
            <th className="px-2 py-2 font-medium">正解率</th>
            <th className="px-2 py-2 font-medium">へん報告</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.question_id}>
              <td className="max-w-md px-4 py-1.5">
                <span className="text-xs text-muted-foreground">#{row.question_id} </span>
                <span className="line-clamp-2">{row.prompt}</span>
              </td>
              <td className="px-2 py-1.5">{formatCount(row.answers)}</td>
              <td className="px-2 py-1.5">{formatRate(row.accuracy)}</td>
              <td className="px-2 py-1.5">{formatCount(row.reports)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
