import type { Destination } from "./types";

export function receivedCount(destination: Destination): number {
  return destination.souvenirs.filter((souvenir) => souvenir.received).length;
}

/** 旅のハブで日本の島のスプルが言うひとこと。上から順に最初に当てはまるもの(設計書5-1) */
export function hubLine(destinations: Destination[]): string {
  const gift = destinations.find((destination) => destination.gift_ready);
  if (gift) return `${gift.name}のおみやげ屋さんで、おみやげを受け取れるよ！`;

  const next = destinations.find((destination) => destination.state === "next");
  if (!next) return `${destinations.length}つの国をぜんぶ旅したね！すごい！`;
  if (next.ready) return `じゅんびができたよ！${next.name}へ出発しよう`;

  const missing = next.checklist.find((row) => !row.done);
  if (missing?.kind === "level") return `次は${next.name}！${missing.hint ?? ""}だね`;
  if (missing) return `${missing.label}があれば${next.name}へ行けるよ`;
  return `次は${next.name}！`;
}

/** 島のボタンの読み上げ用ラベル(設計書5-1) */
export function islandLabel(destination: Destination): string {
  if (destination.state === "visited") {
    return `${destination.name}(着いた国・おみやげ${receivedCount(destination)}/${destination.souvenirs.length})`;
  }
  if (destination.state === "next") return `${destination.name}(${destination.ready ? "出発できます" : "じゅんび中"})`;
  return `${destination.name}(まだ先)`;
}

/** 島に出す札。まだ先の国は出さない */
export function islandTag(destination: Destination): string | null {
  if (destination.state === "visited") {
    return destination.gift_ready ? "おみやげ！" : `おみやげ ${receivedCount(destination)}/${destination.souvenirs.length}`;
  }
  if (destination.state === "next") return destination.ready ? "出発できる" : "じゅんび中";
  return null;
}

export type BeginnerGroupLike = { category: { is_language_mode: boolean }; difficulty: string; stages: { is_boss: boolean }[] };

/** 国の画面に出す初級のステージのグループ。ことばを学ぶモードでなく、ボスがあるもの(なければ最初の初級)(設計書5-3) */
export function pickBeginnerGroup<T extends BeginnerGroupLike>(groups: T[]): T | null {
  const beginner = groups.filter((group) => group.difficulty === "初級");
  return (
    beginner.find((group) => !group.category.is_language_mode && group.stages.some((stage) => stage.is_boss)) ??
    beginner[0] ??
    null
  );
}

// 出発の場面の区切り(設計書5-2)。桟橋へ歩く → 船で渡る → 着いた → 国の画面へ
export const WALK_MS = 1_200;
export const SAIL_MS = 2_800;
export const ARRIVE_MS = 4_200;

export type DeparturePhase = "walk" | "sail" | "arrive" | "done";

/** 場面をどこから始めるか。動きを減らす設定のときは着いた場面から */
export function departureStart(reduced: boolean): number {
  return reduced ? SAIL_MS : 0;
}

export function departurePhase(elapsed: number): DeparturePhase {
  if (elapsed < WALK_MS) return "walk";
  if (elapsed < SAIL_MS) return "sail";
  if (elapsed < ARRIVE_MS) return "arrive";
  return "done";
}
