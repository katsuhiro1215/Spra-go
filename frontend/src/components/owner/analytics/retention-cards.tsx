import { formatRate, type AnalyticsData } from "@/lib/analytics";

const ITEMS = [
  { key: "d1", label: "1日後" },
  { key: "d3", label: "3日後" },
  { key: "d7", label: "7日後" },
] as const;

/** また来た割合(docs/design/2026-10-03-analytics-design.md 6-1)。初めて遊んだ日から、その日数が経ったプレイヤーだけが母数 */
export function RetentionCards({ retention }: { retention: AnalyticsData["retention"] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {ITEMS.map(({ key, label }) => {
        const item = retention[key];
        return (
          <div key={key} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}にまた遊んだ</p>
            <p className="mt-1 text-2xl font-bold">{item.rate === null ? "—" : formatRate(item.rate)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.rate === null ? "まだデータがありません" : `母数 ${item.base}人`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
