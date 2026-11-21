import { KpiCard as Card } from "@/components/owner/kpi-card";
import { formatCount, formatMinutes, type AnalyticsData } from "@/lib/analytics";

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
