import { formatCount, formatRate, type AnalyticsData } from "@/lib/analytics";

/**
 * どこでやめたか(docs/design/2026-10-03-analytics-design.md 6-1)。段階ごとの人数(横棒)と、前の段階からの割合。
 * 続けて、離れた人が最後に進んだ段階の内訳
 */
export function FunnelChart({ funnel, dropoff }: { funnel: AnalyticsData["funnel"]; dropoff: AnalyticsData["dropoff"] }) {
  const max = Math.max(1, ...funnel.map((step) => step.count));
  const lapsedTotal = dropoff.reduce((sum, step) => sum + step.count, 0);

  return (
    <div className="viz-root grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">段階ごとの人数</h3>
        <ol className="flex flex-col gap-2">
          {funnel.map((step) => (
            <li key={step.key} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2 text-sm">
              <span className="truncate">{step.label}</span>
              <span className="h-5 rounded-r bg-muted">
                <span
                  className="block h-5 rounded-r"
                  style={{ width: `${(step.count / max) * 100}%`, background: "var(--series-1)", minWidth: step.count > 0 ? 4 : 0 }}
                />
              </span>
              <span className="text-right text-xs text-muted-foreground">
                {formatCount(step.count)}
                {step.rate !== null && <span className="block">{formatRate(step.rate)}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">右の％は、前の段階を満たした人のうち、その段階に進んだ割合です。</p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">離れた人が、最後に進んだ段階</h3>
        {lapsedTotal === 0 ? (
          <p className="text-sm text-muted-foreground">まだデータがありません。</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {dropoff.map((step) => (
                <tr key={step.key}>
                  <td className="py-1.5">{step.label}</td>
                  <td className="py-1.5 text-right">{step.count}人</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">離れた人: 最後に答えたのが7日以上前の人。</p>
      </div>
    </div>
  );
}
