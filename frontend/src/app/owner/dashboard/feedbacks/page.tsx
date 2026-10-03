"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, kindLabel, statusLabel } from "@/lib/feedback";

type Feedback = {
  id: number;
  kind: string;
  status: string;
  body: string | null;
  reason: string | null;
  page: string | null;
  question_id: number | null;
  question_prompt: string | null;
  user_name: string | null;
  created_at: string | null;
};

type Page = { data: Feedback[]; current_page: number; last_page: number; total: number };

/** 状態を進めるボタン。新着→確認済み→対応済み。対応済みからは新着に戻せる */
const NEXT_STATUS: Record<string, string> = { new: "read", read: "done", done: "new" };

const SELECT_CLASS = "h-8 rounded-lg border border-input bg-background px-2 text-sm";

/** ご意見の一覧(docs/design/2026-10-03-closed-beta-design.md 5-3)。保護者の文章と、子どもの問題の「へん」報告 */
export default function Page() {
  const [page, setPage] = useState<Page | null>(null);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(pageNumber) });
    if (kind) query.set("kind", kind);
    if (status) query.set("status", status);

    apiFetch(`/api/owner/feedbacks?${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setError(null);
        setPage(await res.json());
      })
      .catch(() => setError("ご意見の取得に失敗しました。"));
  }, [kind, status, pageNumber]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(item: Feedback) {
    const res = await apiFetch(`/api/owner/feedbacks/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: NEXT_STATUS[item.status] ?? "read" }),
    });
    if (res.ok) load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">ご意見</h1>
        <p className="text-sm text-muted-foreground">{page ? `全${page.total}件` : "読み込み中..."}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="種類で絞り込む"
          className={SELECT_CLASS}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPageNumber(1);
          }}
        >
          <option value="">すべての種類</option>
          {Object.entries(FEEDBACK_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="状態で絞り込む"
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPageNumber(1);
          }}
        >
          <option value="">すべての状態</option>
          {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {page && page.data.length === 0 && <p className="text-sm text-muted-foreground">ご意見はまだありません。</p>}

      {page && page.data.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {page.data.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.kind === "question_report" ? "secondary" : "outline"}>{kindLabel(item.kind)}</Badge>
                <Badge variant={item.status === "new" ? "default" : "outline"}>{statusLabel(item.status)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {item.user_name ?? "（削除されたアカウント）"}
                  {item.created_at ? ` ・ ${new Date(item.created_at).toLocaleString("ja-JP")}` : ""}
                </span>
                <Button variant="outline" size="xs" className="ml-auto" onClick={() => changeStatus(item)}>
                  {statusLabel(NEXT_STATUS[item.status] ?? "read")}にする
                </Button>
              </div>
              {item.body && <p className="text-sm whitespace-pre-wrap">{item.body}</p>}
              {item.kind === "question_report" && (
                <p className="text-xs text-muted-foreground">
                  {item.question_id !== null
                    ? `問題 #${item.question_id}：${item.question_prompt ?? ""}`
                    : "（問題は削除されています）"}
                </p>
              )}
              {item.page && <p className="text-xs text-muted-foreground">画面: {item.page}</p>}
            </div>
          ))}
        </div>
      )}

      {page && page.last_page > 1 && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((n) => n - 1)}>
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {page.current_page} / {page.last_page}
          </span>
          <Button variant="outline" size="sm" disabled={pageNumber >= page.last_page} onClick={() => setPageNumber((n) => n + 1)}>
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
