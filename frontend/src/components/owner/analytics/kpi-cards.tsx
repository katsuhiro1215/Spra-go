import { formatCount, formatMinutes, type AnalyticsData } from "@/lib/analytics";

function Card({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

/** 概要のカード(docs/design/2026-10-03-analytics-design.md 6-1) */
export function KpiCards({ summary }: { summary: AnalyticsData["summary"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <Card label="登録アカウント数" value={formatCount(summary.accounts)} />
      <Card label="プレイヤー数" value={formatCount(summary.players)} />
      <Card label="今日遊んだ人数" value={formatCount(summary.active_today)} sublabel="問題に1問でも答えた人" />
      <Card label="直近7日に遊んだ人数" value={formatCount(summary.active_7d)} />
      <Card label="直近30日に遊んだ人数" value={formatCount(summary.active_30d)} />
      <Card label="今日解かれた問題数" value={formatCount(summary.answers_today)} />
      <Card label="今日遊んだ時間" value={formatMinutes(summary.play_minutes_today)} sublabel="プレイヤー全員の合計" />
    </div>
  );
}
