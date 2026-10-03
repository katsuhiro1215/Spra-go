"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ActivitiesTable } from "@/components/owner/analytics/activities-table";
import { CohortTable } from "@/components/owner/analytics/cohort-table";
import { DailyCharts } from "@/components/owner/analytics/daily-charts";
import { ExportButton } from "@/components/owner/analytics/export-button";
import { FunnelChart } from "@/components/owner/analytics/funnel-chart";
import { HardQuestionsTable } from "@/components/owner/analytics/hard-questions-table";
import { KpiCards } from "@/components/owner/analytics/kpi-cards";
import { RetentionCards } from "@/components/owner/analytics/retention-cards";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { PERIODS, type AnalyticsData } from "@/lib/analytics";

function Section({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  );
}

/** 分析(docs/design/2026-10-03-analytics-design.md 6-1)。遊んだ人数・続き具合・やめた場所・まちがいの多い問題・遊び・遊んだ時間 */
export default function Page() {
  const [days, setDays] = useState<number>(14);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch(`/api/owner/analytics?days=${days}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body: AnalyticsData = await res.json();
        if (!active) return;
        setError(null);
        setData(body);
      })
      .catch(() => {
        if (active) setError("分析の取得に失敗しました。");
      });

    return () => {
      active = false;
    };
  }, [days]);

  const loading = !error && data?.days !== days;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">分析</h1>
          <p className="text-sm text-muted-foreground">問題に1問でも答えた人を「遊んだ人」として数えています（日本時間の0時で区切り）</p>
        </div>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="期間">
          {PERIODS.map((period) => (
            <Button key={period} size="sm" variant={period === days ? "default" : "outline"} aria-pressed={period === days} onClick={() => setDays(period)}>
              {period}日
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}

      {data && (
        <div className={`flex flex-col gap-8 ${loading ? "opacity-60" : ""}`}>
          <KpiCards summary={data.summary} />

          <Section title="日ごとの推移" note={`直近${data.days}日`} action={<ExportButton kind="daily" days={data.days} label="日ごとをCSVで書き出す" />}>
            <DailyCharts rows={data.daily} />
          </Section>

          <Section title="また来た割合" note="期間に関係なく、全プレイヤー">
            <RetentionCards retention={data.retention} />
          </Section>

          <Section title="登録した週ごとの続き具合" note="期間に関係なく、全プレイヤー" action={<ExportButton kind="cohorts" label="CSVで書き出す" />}>
            <CohortTable cohorts={data.cohorts} />
          </Section>

          <Section title="どこでやめたか" note={`直近${data.days}日に作ったプレイヤー`}>
            <FunnelChart funnel={data.funnel} dropoff={data.dropoff} />
          </Section>

          <Section title="まちがいの多い問題" note="全期間・5回以上答えられた問題" action={<ExportButton kind="hard-questions" label="CSVで書き出す" />}>
            <HardQuestionsTable rows={data.hard_questions} />
          </Section>

          <Section title="よく使われる遊び" note={`直近${data.days}日`}>
            <ActivitiesTable rows={data.activities} />
          </Section>

          <Section title="ご意見">
            <p className="text-sm">
              新着 {data.feedback.new}件 ・ 確認済み {data.feedback.read}件 ・ 対応済み {data.feedback.done}件
              <Link href="/owner/dashboard/feedbacks" className="ml-3 underline">
                ご意見の一覧を開く
              </Link>
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}
