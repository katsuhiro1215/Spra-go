"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/feedback";

type Status = "closed" | "choosing" | "sent" | "failed";

/**
 * 問題の「へん？」報告(docs/design/2026-10-03-closed-beta-design.md 5-3)。子どもが選ぶのは3つの理由だけで、
 * 自由な文章は書けない。問題が変わるたびに作り直すため、呼ぶ側が key に問題の番号を付ける。
 * 子どもが読む文なので、ひらがなだけで書く(ふりがなは要らない)
 */
export function ReportQuestion({ questionId }: { questionId: number }) {
  const [status, setStatus] = useState<Status>("closed");

  async function report(reason: string) {
    try {
      const res = await apiFetch(`/api/questions/${questionId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setStatus(res.ok ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return <p className="text-[11px] font-black text-[#6b5d45]">おしえてくれて ありがとう</p>;
  }

  if (status === "closed" || status === "failed") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setStatus("choosing")}
          className="rounded-full bg-[#f5efe1] px-2.5 py-1 text-[11px] font-black text-[#6b5d45] hover:bg-[#efe5cf]"
        >
          へん？
        </button>
        {status === "failed" && <p className="text-[11px] font-bold text-[#c2402c]">いまは おくれなかったよ</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 rounded-2xl bg-white p-2 shadow-md">
      <p className="text-[11px] font-black text-[#3b3226]">どんなふうに へん？</p>
      {REPORT_REASONS.map((reason) => (
        <button
          key={reason.value}
          type="button"
          onClick={() => report(reason.value)}
          className="w-full rounded-full border-2 border-[#e8dfcf] bg-[#fffaf0] px-3 py-1 text-left text-[11px] font-black text-[#3b3226] hover:bg-white"
        >
          {reason.label}
        </button>
      ))}
      <button type="button" onClick={() => setStatus("closed")} className="text-[11px] font-bold text-[#6b5d45] underline">
        やめる
      </button>
    </div>
  );
}
