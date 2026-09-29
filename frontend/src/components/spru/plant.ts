import { GROWTH_IMAGES, type SpruImage } from "./spru-assets";

export type PlantStage = "seed" | "sprout" | "bud" | "flower";

/**
 * 畑で育つ絵(docs/design/2026-09-29-rare-spru-design.md 3-4)。look は spru(ふつうのスプル。仲間の種もこれ)か
 * レアスプルの色。見た目が無い・絵の無い色は、ふつうのスプルの絵
 */
export function plantImage(look: string | null, stage: PlantStage): SpruImage {
  const images: Record<string, SpruImage> = GROWTH_IMAGES;
  return images[`${look ?? "spru"}/${stage}`] ?? GROWTH_IMAGES[`spru/${stage}`];
}
