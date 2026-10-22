"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { APPS } from "@/lib/apps";

type Summary = {
  user_count: number;
  profile_count: number;
  new_users_last_7_days: number;
  stage_clears_last_7_days: number;
  countries_with_content: number;
  invite_code_empty: boolean;
  apps: { counts: Record<string, number>; multiple: number };
  coin_purchases: {
    completed_count: number;
    completed_amount_this_month: number;
  };
};

type TaneSummary = {
  profile_count: number;
  active_profiles_last_7_days: number;
  first_play_rate: { accounts: number; played: number; rate: number | null };
  modes: {
    mode: string;
    players: number;
    total_stars: number;
    max_profile_stars: number;
    max_stage_stars: number;
  }[];
};

const TANE_MODE_LABELS: Record<string, string> = {
  add: "たしざん",
  sub: "ひきざん",
  mul: "かけざん",
  div: "わりざん",
  flash: "フラッシュ",
  soroban: "そろばん",
  shisoku: "たねまき",
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

  const [tane, setTane] = useState<TaneSummary | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/owner/dashboard/summary");
      setSummary(res.ok ? await res.json() : null);
    })();
    (async () => {
      const res = await apiFetch("/api/owner/dashboard/tane");
      setTane(res.ok ? await res.json() : null);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Owner Dashboard</h1>

      {summary?.invite_code_empty && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          招待コードが空です。誰でも登録できます。
          <Link href="/owner/dashboard/settings" className="ml-2 underline">
            公開設定を開く
          </Link>
        </p>
      )}

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
          {APPS.map((app) => (
            <KpiCard key={app.key} label={`${app.label}を使っている人`} value={summary.apps.counts[app.key] ?? 0} />
          ))}
          <KpiCard label="複数のアプリを使っている人" value={summary.apps.multiple} />
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

      {tane && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Tane</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="記録のあるプロフィール" value={tane.profile_count} />
            <KpiCard
              label="直近7日に遊んだプロフィール"
              value={tane.active_profiles_last_7_days}
            />
            <KpiCard
              label="使い始めて、遊んだ家族"
              value={
                tane.first_play_rate.rate === null
                  ? "-"
                  : `${Math.round(tane.first_play_rate.rate * 100)}%`
              }
              sublabel={`${tane.first_play_rate.played} / ${tane.first_play_rate.accounts} 家族`}
            />
          </div>
          <details className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium">
              あそびごとの★
            </summary>
            <table className="mt-3 w-full text-left">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">あそび</th>
                  <th>遊んだ人</th>
                  <th>★の合計</th>
                  <th>1人の最大</th>
                  <th>1ステージの最大</th>
                </tr>
              </thead>
              <tbody>
                {tane.modes.map((m) => (
                  <tr key={m.mode} className="border-t border-border">
                    <td className="py-1">
                      {TANE_MODE_LABELS[m.mode] ?? m.mode}
                    </td>
                    <td>{m.players}</td>
                    <td>{m.total_stars}</td>
                    <td>{m.max_profile_stars}</td>
                    <td>{m.max_stage_stars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      )}
    </div>
  );
}
