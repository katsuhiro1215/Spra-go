import { formatCount, type AnalyticsData } from "@/lib/analytics";

/** よく使われる遊び(docs/design/2026-10-03-analytics-design.md 6-1)。回数を持たない遊び(復習・水やり)は「—」 */
export function ActivitiesTable({ rows }: { rows: AnalyticsData["activities"] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">遊び</th>
            <th className="px-2 py-2 font-medium">人数</th>
            <th className="px-2 py-2 font-medium">回数</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-1.5">{row.label}</td>
              <td className="px-2 py-1.5">{formatCount(row.players)}</td>
              <td className="px-2 py-1.5">{formatCount(row.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
