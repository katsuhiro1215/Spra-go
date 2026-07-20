export type Stat = {
  label: string;
  value: string;
};

export const stats: Stat[] = [
  { label: "総ユーザー数", value: "1,204" },
  { label: "総国数", value: "8" },
  { label: "総クイズ数", value: "5" },
  { label: "開催中イベント", value: "1" },
];

export type SystemStatus = {
  label: string;
  value: string;
  ok: boolean;
};

export const systemStatuses: SystemStatus[] = [
  { label: "メンテナンスモード", value: "OFF", ok: true },
  { label: "キャッシュ", value: "有効", ok: true },
  { label: "キュー", value: "稼働中", ok: true },
  { label: "最終バックアップ", value: "2026-07-20 03:00", ok: true },
];
