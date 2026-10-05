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
