"use client";

import { useEffect, useState } from "react";

import { KpiCard } from "@/components/owner/kpi-card";
import { apiFetch } from "@/lib/api";

type DeerSummary = {
  profile_count: number;
  active_profiles_last_7_days: number;
  anon_players_last_7_days: number;
  first_play_rate: { accounts: number; played: number; rate: number | null };
  public_ranking_families: number;
  worlds: { world: number; plays: number; players: number; clears: number }[];
};

export default function Page() {
  const [deer, setDeer] = useState<DeerSummary | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/owner/dashboard/deer");
      setDeer(res.ok ? await res.json() : null);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Spraと鹿。</h1>

      {deer === undefined ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : deer === null ? (
        <p className="text-sm text-destructive">サマリーの取得に失敗しました。</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="記録のあるプロフィール" value={deer.profile_count} />
            <KpiCard label="直近7日に遊んだプロフィール(ログイン)" value={deer.active_profiles_last_7_days} />
            <KpiCard label="直近7日に遊んだ端末(ログインなし)" value={deer.anon_players_last_7_days} />
            <KpiCard
              label="使い始めて、遊んだ家族"
              value={deer.first_play_rate.rate === null ? "-" : `${Math.round(deer.first_play_rate.rate * 100)}%`}
              sublabel={`${deer.first_play_rate.played} / ${deer.first_play_rate.accounts} 家族`}
            />
            <KpiCard label="みんなのランキングを公開している家族" value={deer.public_ranking_families} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <p className="font-medium">ワールドごとの遊ばれ方(ログインなしもふくむ)</p>
            <table className="mt-3 w-full text-left">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">ワールド</th>
                  <th>遊ばれた回数</th>
                  <th>遊んだ人数</th>
                  <th>クリア数</th>
                </tr>
              </thead>
              <tbody>
                {deer.worlds.map((w) => (
                  <tr key={w.world} className="border-t border-border">
                    <td className="py-1">{w.world}</td>
                    <td>{w.plays}</td>
                    <td>{w.players}</td>
                    <td>{w.clears}</td>
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
