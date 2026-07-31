"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type Summary = {
  user_count: number;
  profile_count: number;
  new_users_last_7_days: number;
  stage_clears_last_7_days: number;
  countries_with_content: number;
  coin_purchases: {
    completed_count: number;
    completed_amount_this_month: number;
  };
};

function KpiCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

export default function Page() {
  const [summary, setSummary] = useState<Summary | null | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/owner/dashboard/summary");
      setSummary(res.ok ? await res.json() : null);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Owner Dashboard</h1>

      {summary === undefined ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : summary === null ? (
        <p className="text-sm text-destructive">
          サマリーの取得に失敗しました。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="登録ユーザー数" value={summary.user_count} />
          <KpiCard
            label="プレイヤー(プロフィール)数"
            value={summary.profile_count}
          />
          <KpiCard
            label="新規登録(直近7日)"
            value={summary.new_users_last_7_days}
          />
          <KpiCard
            label="ステージクリア(直近7日)"
            value={summary.stage_clears_last_7_days}
          />
          <KpiCard
            label="コンテンツがある国"
            value={summary.countries_with_content}
          />
          <KpiCard
            label="コイン購入(累計件数)"
            value={summary.coin_purchases.completed_count}
          />
          <KpiCard
            label="コイン購入額(今月)"
            value={`¥${summary.coin_purchases.completed_amount_this_month.toLocaleString()}`}
          />
        </div>
      )}
    </div>
  );
}
