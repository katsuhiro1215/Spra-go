"use client";

import { useEffect, useState } from "react";

import { KpiCard } from "@/components/owner/kpi-card";
import { apiFetch } from "@/lib/api";

type DeerLevel = { level: string; plays: number; players: number; clears: number; clear_players: number };

type DeerSummary = {
  profile_count: number;
  active_profiles_last_7_days: number;
  anon_players_last_7_days: number;
  first_play_rate: { accounts: number; played: number; rate: number | null };
  public_ranking_families: number;
  total_plays: number;
  total_players: number;
  worlds: { world: number; plays: number; players: number; clears: number }[];
  levels: DeerLevel[];
};

function levelOrder(level: string): [number, number] {
  const [world, stage] = level.split("-").map(Number);
  return [world, stage];
}

/** 遊ばれた回数が少ない順(同じなら面の番号順)。あまり遊ばれていない面を見つけやすくする */
function byLeastPlayed(levels: DeerLevel[]): DeerLevel[] {
  return [...levels].sort((a, b) => {
    if (a.plays !== b.plays) return a.plays - b.plays;
    const [aw, as] = levelOrder(a.level);
    const [bw, bs] = levelOrder(b.level);

    return aw - bw || as - bs;
  });
}

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
            <KpiCard label="遊ばれた回数(累計・ログインなしもふくむ)" value={deer.total_plays} />
            <KpiCard label="遊んだ人数(累計)" value={deer.total_players} />
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
          <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <p className="font-medium">面ごとの遊ばれ方(遊ばれた回数が少ない順。あまり遊ばれていない面を見つける用)</p>
            <div className="mt-3 max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1">面</th>
                    <th>遊ばれた回数</th>
                    <th>遊んだ人数</th>
                    <th>クリア数</th>
                    <th>クリアした人数</th>
                  </tr>
                </thead>
                <tbody>
                  {byLeastPlayed(deer.levels).map((l) => (
                    <tr key={l.level} className="border-t border-border">
                      <td className="py-1">{l.level}</td>
                      <td>{l.plays}</td>
                      <td>{l.players}</td>
                      <td>{l.clears}</td>
                      <td>{l.clear_players}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
