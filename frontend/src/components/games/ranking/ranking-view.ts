import { formatTime } from "@/lib/slide-puzzle";

import { CATCH_MODES, type CatchMode } from "../catch/catch-view";

export type RankingRow = { rank: number; name?: string; nickname?: string; avatar: string | null; value: number; is_me: boolean };
export type RankingBoard = { rows: RankingRow[]; me: { rank: number; value: number } | null };
export type RankingSettings = { public: boolean; nickname: string };
export type RankingScope = "family" | "public";
export type RankingPeriod = "week" | "all";

/** ランキングの画面のパス(/games/ranking/{slug})とゲーム。パズルは時間の短い順、ほかは点数の高い順 */
export const RANKING_GAMES: Record<string, { mode: CatchMode; time: boolean }> = {
  catch: { mode: "catch", time: false },
  "flag-catch": { mode: "flag_catch", time: false },
  "space-trip": { mode: "space_trip", time: false },
  "puzzle-flag": { mode: "puzzle_flag", time: true },
  "puzzle-space": { mode: "puzzle_space", time: true },
};

/** ゲームの画面から、ランキングの画面へのリンク */
export function rankingHref(mode: CatchMode): string {
  const slug = CATCH_MODES[mode].apiPath.split("/").pop();
  return `/games/ranking/${slug}`;
}

export function rankingApiPath(slug: string): string {
  return `/api/games/${slug}/ranking`;
}

export function valueText(time: boolean, value: number): string {
  return time ? formatTime(value) : `${value}点`;
}

export function rankText(rank: number): string {
  return `${rank}位`;
}

/** 終えた画面に出す、順位の行(記録がなければ出さない) */
export function rankLines(result: { rank_family?: number | null; rank_public?: number | null }): string[] {
  const lines: string[] = [];
  if (result.rank_family != null) lines.push(`かぞくで ${rankText(result.rank_family)}（こんしゅう）`);
  if (result.rank_public != null) lines.push(`みんなで ${rankText(result.rank_public)}（こんしゅう）`);
  return lines;
}

export function boardUrl(slug: string, scope: RankingScope, difficulty: string, period: RankingPeriod): string {
  return `${rankingApiPath(slug)}?${new URLSearchParams({ scope, difficulty, period }).toString()}`;
}
