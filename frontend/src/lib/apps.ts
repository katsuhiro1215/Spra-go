// Spra のアプリ(サーバーの config/apps.php と同じキー。docs/design/2026-10-14-multi-app-accounts-design.md)
export const APPS = [
  { key: "go", label: "Spra Go" },
  { key: "tane", label: "Tane" },
  { key: "world", label: "Spra World" },
] as const;

export type AppUse = { app: string; first_used_at: string; last_used_at: string };

export type AppFilter = "all" | "go" | "tane" | "world" | "multiple";

export function appLabel(key: string): string {
  return APPS.find((a) => a.key === key)?.label ?? key;
}

/** Owner画面の絞り込み。「Goだけ」「Taneだけ」は、そのアプリだけを使っている人(複数は別に見る) */
export function matchesAppFilter(apps: AppUse[], filter: AppFilter): boolean {
  if (filter === "all") return true;
  if (filter === "multiple") return apps.length >= 2;
  return apps.length === 1 && apps[0].app === filter;
}
