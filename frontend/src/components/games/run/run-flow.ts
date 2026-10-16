/**
 * スプルランの流れの、画面を描かない部分(docs/design/2026-10-22-spru-run-design.md 14-2)。
 * 練習(タネなし・サーバーなし)と本番(1日2回・タネ・ランキング)
 */
export type RunMode = "practice" | "real";

/** 始めてからこの時間以内のやめるは、回を戻す。サーバーの10秒より、通信のぶん手前で分ける */
export const ABANDON_BEFORE_MS = 9000;

export function quitAction(sinceStartMs: number): "abandon" | "finish" {
  return sinceStartMs <= ABANDON_BEFORE_MS ? "abandon" : "finish";
}

export function quitMessage(mode: RunMode, sinceStartMs: number): string {
  if (mode === "practice") return "やめる？練習だから、記録は残らないよ";
  return quitAction(sinceStartMs) === "abandon" ? "やめる？まだ始めたばかりだから、本番の1回には数えないよ" : "やめる？ここまでの記録で終わるよ";
}

export function realButtonState(playsLeft: number | null): { enabled: boolean; label: string } {
  if (playsLeft === null) return { enabled: false, label: "本番にちょうせん" };
  if (playsLeft <= 0) return { enabled: false, label: "本番はあしたまた来てね" };
  return { enabled: true, label: `本番にちょうせん（のこり${playsLeft}回）` };
}

export function playsLeftText(playsLeft: number): string {
  return playsLeft > 0 ? `きょうの本番は、あと${playsLeft}回` : "きょうの本番は、おしまい";
}
