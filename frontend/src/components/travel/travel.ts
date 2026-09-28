import { SPRU_TRAVEL, type SpruImage } from "@/components/spru/spru-assets";

import type { Destination, TravelData, Transport } from "./types";

export function receivedCount(destination: Destination): number {
  return destination.souvenirs.filter((souvenir) => souvenir.received).length;
}

/** せかいで日本の島のスプルが言うひとこと。上から順に最初に当てはまるもの(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-2) */
export function hubLine(travel: Pick<TravelData, "tickets" | "ticket_hint" | "destinations">): string {
  const { destinations } = travel;
  const gift = destinations.find((destination) => destination.gift_ready);
  if (gift) return `${gift.name}のおみやげ屋さんで、おみやげを受け取れるよ！`;
  if (travel.tickets > 0) return "チケットがあるよ！行きたい国を選んでね";
  if (destinations.some((destination) => destination.state === "unvisited")) return ticketHintText(travel.ticket_hint);
  return `${destinations.length}つの国をぜんぶ旅したね！すごい！`;
}

/** チケットのもらい方(ticket_hint は、初級のボスをまだ倒していない学べる国の名前) */
export function ticketHintText(hint: string | null): string {
  return hint ? `${hint}の初級のボスを倒すと、チケットがもらえるよ` : "初級のボスを倒すと、チケットがもらえるよ";
}

/** 島のボタンの読み上げ用ラベル(設計書5-2) */
export function islandLabel(destination: Destination): string {
  if (destination.state === "visited") {
    return `${destination.name}(着いた国・おみやげ${receivedCount(destination)}/${destination.souvenirs.length})`;
  }
  return destination.can_depart ? `${destination.name}(まだの国・行けます)` : `${destination.name}(まだの国)`;
}

/** 島に出す札 */
export function islandTag(destination: Destination): string {
  if (destination.state === "visited") {
    return destination.gift_ready ? "おみやげ！" : `おみやげ ${receivedCount(destination)}/${destination.souvenirs.length}`;
  }
  return destination.can_depart ? "行ける！" : "？";
}

export function transportText(transport: Transport): string {
  return transport === "plane" ? "飛行機で行く国" : "船で行く国";
}

/** 出発の場面の乗り物の絵。元の絵は左向きなので、画面では左右を反転して出す(docs/design/2026-09-29-spru-icons-design.md 4-7) */
export function vehicleImage(transport: Transport): SpruImage {
  return transport === "plane" ? SPRU_TRAVEL.plane : SPRU_TRAVEL.ship;
}

/** 出発の場面の文(設計書5-3)。sail は乗り物で向かっているところ(船も飛行機も) */
export function departureCaption(phase: DeparturePhase, destination: Pick<Destination, "name" | "transport">): string {
  const plane = destination.transport === "plane";
  if (phase === "walk") return plane ? "空港から出発！" : "桟橋から出発！";
  if (phase === "sail") return `${destination.name}へ${plane ? "飛行機" : "船"}で向かっているよ`;
  return `${destination.name}に着いた！`;
}

/** 学ぶタブで、鍵のない国だけを並びのまま残す(地図の表示に渡す。設計書5-5) */
export function unlockedCountries<T extends { locked: boolean }>(countries: T[]): T[] {
  return countries.filter((country) => !country.locked);
}

/** 学ぶタブで鍵の国を押したときの案内(設計書5-5) */
export function lockedCountryText(name: string): string {
  return `${name}へは『せかい』でチケットを使うと行けるよ`;
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
