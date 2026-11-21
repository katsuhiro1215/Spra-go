"use client";

import { useEffect, useState } from "react";

import { KpiCard } from "@/components/owner/kpi-card";
import { apiFetch } from "@/lib/api";

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

export default function Page() {
  const [tane, setTane] = useState<TaneSummary | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/owner/dashboard/tane");
      setTane(res.ok ? await res.json() : null);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Tane</h1>

      {tane === undefined ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : tane === null ? (
        <p className="text-sm text-destructive">サマリーの取得に失敗しました。</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="記録のあるプロフィール" value={tane.profile_count} />
            <KpiCard label="直近7日に遊んだプロフィール" value={tane.active_profiles_last_7_days} />
            <KpiCard
              label="使い始めて、遊んだ家族"
              value={tane.first_play_rate.rate === null ? "-" : `${Math.round(tane.first_play_rate.rate * 100)}%`}
              sublabel={`${tane.first_play_rate.played} / ${tane.first_play_rate.accounts} 家族`}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <p className="font-medium">あそびごとの★</p>
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
                    <td className="py-1">{TANE_MODE_LABELS[m.mode] ?? m.mode}</td>
                    <td>{m.players}</td>
                    <td>{m.total_stars}</td>
                    <td>{m.max_profile_stars}</td>
                    <td>{m.max_stage_stars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
