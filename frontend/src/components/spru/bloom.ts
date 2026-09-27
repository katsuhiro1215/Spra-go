import { SPRU_BLOOM, SPRU_STAND_HEIGHT, SPRU_TIPS, type SpruImageKey } from "./spru-assets";

export type Bloom = "bud" | "flower";

// 立ち姿の高さに対する、つぼみ・花の幅と、Sの先から下へずらす量(素材集で見た目を合わせた値)
const BLOOM_WIDTH_RATIO: Record<Bloom, number> = { flower: 0.22, bud: 0.13 };
const BLOOM_DROP_RATIO = 0.055;

/** 育ち具合(0〜3)から、Sの先に付けるもの。種ができた(3)も花のまま */
export function bloomOf(growth: number): Bloom | null {
  if (growth >= 2) return "flower";
  if (growth === 1) return "bud";
  return null;
}

/** つぼみ・花を描く四角(スプルの画像の中のピクセル座標)。Sの先が無い画像(種まき)は null */
export function bloomRect(
  image: SpruImageKey,
  bloom: Bloom,
): { x: number; y: number; width: number; height: number } | null {
  const tip = SPRU_TIPS[image];
  if (!tip) return null;
  const asset = SPRU_BLOOM[bloom];
  const width = BLOOM_WIDTH_RATIO[bloom] * SPRU_STAND_HEIGHT;
  const height = (width * asset.height) / asset.width;
  return { x: tip.x - width / 2, y: tip.y + BLOOM_DROP_RATIO * SPRU_STAND_HEIGHT - height / 2, width, height };
}
