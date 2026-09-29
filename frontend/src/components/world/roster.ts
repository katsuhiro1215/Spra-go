import type { RosterCondition, RosterMember, WorldCompanion } from "./types";

/** まだのレアスプルの「あと〇〇」(docs/design/2026-09-29-rare-spru-design.md 5-5) */
export function remainingText(condition: RosterCondition): string {
  const left = condition.target - condition.current;
  return left > 0 ? `あと${left}${condition.unit}` : "もうすぐもらえるよ";
}

/** 進み具合の棒の長さ(%) */
export function progressPercent(condition: RosterCondition): number {
  return Math.min(100, Math.round((condition.current / condition.target) * 100));
}

/** カードの状態の一言。生まれた子と、まだのレアスプル(条件を出す)は無し */
export function statusNote(member: Pick<RosterMember, "status" | "rare">): string | null {
  if (member.status === "in_bag") return "種のふくろにあるよ";
  if (member.status === "growing") return "畑で育っているよ";
  if (member.status === "waiting" && !member.rare) return "畑で生まれるよ";
  return null;
}

export type TownAction = { label: string; inTown: boolean; disabled: boolean };

/** 生まれた子の「町に出す／おうちで休む」ボタン。相棒はいつも町にいるので出さない(設計書3-5) */
export function townAction(
  companion: Pick<WorldCompanion, "in_town" | "is_partner">,
  townCount: number,
  limit: number,
): TownAction | null {
  if (companion.is_partner) return null;
  if (companion.in_town) return { label: "おうちで休む", inTown: false, disabled: false };
  const full = townCount >= limit;
  return { label: full ? "町はいっぱい" : "町に出す", inTown: true, disabled: full };
}

export function townCountText(count: number, limit: number): string {
  return `町にいるのは ${count}/${limit}`;
}
