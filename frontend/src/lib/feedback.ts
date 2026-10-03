// ご意見の種類・状態・理由の名前(docs/design/2026-10-03-closed-beta-design.md 5章)。サーバーの Feedback と同じ値

export const WRITTEN_KINDS = [
  { value: "bug", label: "不具合" },
  { value: "request", label: "こうしてほしい" },
  { value: "other", label: "その他" },
] as const;

export const FEEDBACK_KIND_LABELS: Record<string, string> = {
  bug: "不具合",
  request: "こうしてほしい",
  other: "その他",
  question_report: "問題の報告",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  new: "新着",
  read: "確認済み",
  done: "対応済み",
};

/** 子どもが問題の画面で選ぶ「へん」の理由(自由な文章は書けない) */
export const REPORT_REASONS = [
  { value: "wrong_answer", label: "答えがまちがっているみたい" },
  { value: "unreadable", label: "よめない・わからない" },
  { value: "other", label: "そのほか" },
] as const;

export function kindLabel(kind: string): string {
  return FEEDBACK_KIND_LABELS[kind] ?? kind;
}

export function statusLabel(status: string): string {
  return FEEDBACK_STATUS_LABELS[status] ?? status;
}
