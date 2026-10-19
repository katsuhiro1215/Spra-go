"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Row = { rank: number; name?: string; value: number; is_me: boolean };
type Board = { rows: Row[]; me: { rank: number; value: number } | null };
type Period = "week" | "all";

/** スプルランの家族のランキング。本番の記録だけが載る(練習はサーバーに送らない) */
export function RunRanking() {
  const [period, setPeriod] = useState<Period>("week");
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/games/spru-run/ranking?scope=family&difficulty=${encodeURIComponent("ふつう")}&period=${period}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) return setFailed(true);
        setFailed(false);
        setBoard((await res.json()) as Board);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [period]);

  return (
    <main className="flex min-h-dvh justify-center bg-gradient-to-b from-[#8fd3ff] to-[#e8f7ff] px-4 py-6 text-[#3b3226]">
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-center text-2xl font-black">スプルラン ランキング</h1>
        <div className="grid grid-cols-2 gap-2">
          {(["week", "all"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn("h-11 rounded-full text-sm font-black", period === p ? "bg-[#ffb02e] text-white" : "bg-white/80")}
            >
              {p === "week" ? "こんしゅう" : "ぜんぶ"}
            </button>
          ))}
        </div>
        <ol className="flex flex-col gap-2 rounded-3xl bg-[#fffaf0] p-4 shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
          {failed && <li className="text-center text-sm font-bold">読み込めませんでした</li>}
          {board && board.rows.length === 0 && (
            <li className="text-center text-sm font-bold">
              <AutoFurigana text="まだ本番の記録がないよ" />
            </li>
          )}
          {board?.rows.map((row) => (
            <li key={row.rank + (row.name ?? "")} className={cn("flex items-center justify-between rounded-2xl px-3 py-2 font-black", row.is_me ? "bg-[#ffef9e]" : "bg-white")}>
              <span>
                {row.rank}位 {row.name}
              </span>
              <span>{row.value}点</span>
            </li>
          ))}
          {board?.me && (
            <li className="flex justify-between rounded-2xl bg-[#ffef9e] px-3 py-2 font-black">
              <span>{board.me.rank}位 じぶん</span>
              <span>{board.me.value}点</span>
            </li>
          )}
        </ol>
        <Link href="/games/spru-run" className="text-center text-sm font-black underline">
          もどる
        </Link>
      </div>
    </main>
  );
}
