import { MAP_VIEWS, PREFECTURE_SHAPES } from "./japan-map";

export type MapQuestion = { highlight: string; view: string };

/** 問題の meta から、地図の指定を取り出す(設計書 2026-10-13-prefecture-map-quiz 2章)。無い・おかしいときは null */
export function mapQuestionOf(meta: unknown): MapQuestion | null {
  if (typeof meta !== "object" || meta === null) return null;
  const map = (meta as { map?: unknown }).map;
  if (typeof map !== "object" || map === null) return null;
  const { highlight, view } = map as { highlight?: unknown; view?: unknown };
  if (typeof highlight !== "string" || !(highlight in PREFECTURE_SHAPES)) return null;
  if (view === undefined) return { highlight, view: "japan" };
  if (typeof view !== "string" || !(view in MAP_VIEWS)) return null;
  return { highlight, view };
}

export function viewBoxOf(view: string): string {
  return MAP_VIEWS[view].join(" ");
}
