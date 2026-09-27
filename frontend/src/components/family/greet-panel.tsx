"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { apiFetch } from "@/lib/api";

// サーバーの config/world.php の greeting_stamps と同じ(設計書3-4)
const GREETING_STAMPS = [
  { key: "hello", text: "やっほー！" },
  { key: "nice_town", text: "すてきな町だね！" },
  { key: "cheer", text: "いっしょにがんばろう！" },
];

const ALREADY = "今日はもうあいさつしたよ";

/** 家族の町の下の「あいさつする」(設計書5-5) */
export function GreetPanel({ profileId, greeted, onGreeted }: { profileId: number; greeted: boolean; onGreeted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(stamp: string) {
    if (busy || greeted) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/family/${profileId}/greet`, { method: "POST", body: JSON.stringify({ stamp }) }).catch(
        () => null,
      );
      const data = res ? await res.json().catch(() => ({})) : {};
      // 別の画面で先に送っていたときも「あいさつした」にそろえる
      if (res?.ok || data.message === ALREADY) {
        setError(null);
        onGreeted();
        return;
      }
      setError(data.message ?? "通信エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="greet-title"
      className="mx-4 mt-4 flex flex-col gap-2 rounded-2xl bg-[rgba(255,250,240,0.96)] p-3 shadow-[0_2px_8px_rgba(59,50,38,0.14)]"
    >
      <h2 id="greet-title" className="text-sm font-black text-[#3b3226]">
        <AutoFurigana text={greeted ? ALREADY : "あいさつする"} />
      </h2>
      <div className="grid grid-cols-3 gap-1.5">
        {GREETING_STAMPS.map((stamp) => (
          <button
            key={stamp.key}
            type="button"
            disabled={busy || greeted}
            onClick={() => send(stamp.key)}
            className="min-h-11 rounded-xl bg-[#3b7f26] px-1.5 py-2 text-[13px] font-black text-white disabled:bg-[#cfc6b3]"
          >
            <AutoFurigana text={stamp.text} />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-[#a33a22]">
          {error}
        </p>
      )}
    </section>
  );
}
