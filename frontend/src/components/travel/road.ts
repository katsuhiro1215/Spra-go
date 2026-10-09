import { GROUND_ART, type GroundArt, type GroundArtKey } from "@/components/world/ground-art";

/** 国の道(設計書 2026-10-05-road-style 4章)。日本は今までの道の絵、ほかは旅の行き先のキーの road_{キー} */

export const ROAD_STYLE_NAMES: Record<string, string> = {
  jp: "日本",
  id: "インドネシア",
  kr: "韓国",
  us: "アメリカ",
  gb: "イギリス",
  fr: "フランス",
};

/** 「インドネシアの道」などの表示名。知らないキーは、キーのまま */
export function roadName(style: string): string {
  return `${ROAD_STYLE_NAMES[style] ?? style}の道`;
}

export function roadArtKey(style: string): GroundArtKey {
  return style === "jp" ? "path" : (`road_${style}` as GroundArtKey);
}

/** その道の絵。絵が無ければ日本の道の絵、それも無ければ null(今の道の色で描く) */
export function roadArt(
  style: string,
  arts: Partial<Record<GroundArtKey, GroundArt>> = GROUND_ART,
): { key: GroundArtKey; art: GroundArt } | null {
  const key = roadArtKey(style);
  const own = arts[key];
  if (own) return { key, art: own };
  const fallback = arts.path;
  return fallback ? { key: "path", art: fallback } : null;
}

/** 旅のハブの着いた国のカードで、道のボタンをどうするか。絵が無ければ出さない */
export function roadChoice(style: string, selected: string, hasArt: boolean): "select" | "selected" | "none" {
  if (!hasArt) return "none";
  return style === selected ? "selected" : "select";
}

/**
 * 道の縁(設計書 2026-10-09-road-look 3章)。band は道の内側に引く縁の帯(土の道は null)、
 * line は道と草地の境の細い外線。日本の土の道の外線は、今までと同じ薄い茶色
 */
export type RoadEdge = {
  band: string | null;
  bandWidth: number;
  line: string;
  lineOpacity: number;
  lineWidth: number;
  /** 中心線と横断歩道(アスファルトの道だけ) */
  marks: boolean;
};

const DIRT_EDGE: RoadEdge = { band: null, bandWidth: 0, line: "#8a6a1c", lineOpacity: 0.18, lineWidth: 1, marks: false };

const ROAD_EDGES: Record<string, RoadEdge> = {
  jp: DIRT_EDGE,
  id: { ...DIRT_EDGE, line: "#7a3f28", lineOpacity: 0.22 },
  us: { band: "#cfcdc6", bandWidth: 5, line: "#46464b", lineOpacity: 0.5, lineWidth: 1.2, marks: true },
  kr: { band: "#9a978f", bandWidth: 4, line: "#55524b", lineOpacity: 0.4, lineWidth: 1.2, marks: false },
  gb: { band: "#656a72", bandWidth: 4, line: "#3d4045", lineOpacity: 0.45, lineWidth: 1.2, marks: false },
  fr: { band: "#e4dac5", bandWidth: 4, line: "#8d8068", lineOpacity: 0.4, lineWidth: 1.2, marks: false },
};

export function roadEdge(style: string): RoadEdge {
  return ROAD_EDGES[style] ?? DIRT_EDGE;
}
