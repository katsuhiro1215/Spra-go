import { plantImage, type PlantStage } from "@/components/spru/plant";

import type { GardenState } from "./types";

// 畑の状態ごとの絵と高さ(SVGの単位)。2回水をあげた大きな芽は、つぼみの絵(docs/design/2026-09-29-rare-spru-design.md 3-4)
const PLANT: Record<Exclude<GardenState, "empty">, { stage: PlantStage; height: number }> = {
  seed: { stage: "seed", height: 16 },
  sprout: { stage: "sprout", height: 24 },
  sprout_big: { stage: "bud", height: 30 },
};

/** スプルの家の前の畑(原点=マスの中心)。土の畝に、水やりの回数に応じた種・芽・つぼみを重ねる */
export function GardenArt({ state, look }: { state: GardenState; look: string | null }) {
  const plant = state === "empty" ? null : PLANT[state];
  const asset = plant ? plantImage(look, plant.stage) : null;
  const width = plant && asset ? (asset.width * plant.height) / asset.height : 0;
  return (
    <g>
      <ellipse cx={0} cy={3} rx={26} ry={10} fill="#2f5d2a" opacity={0.14} />
      <polygon points="-24,0 0,-12 24,0 0,12" fill="#8a5a3a" />
      <polygon points="-24,0 0,12 0,15 -24,3" fill="#6e452b" />
      <polygon points="0,12 24,0 24,3 0,15" fill="#5c3a24" />
      <path d="M-14 -3 L10 -15 M-8 3 L16 -9 M-2 9 L22 -3" stroke="#6e452b" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      {plant && asset && (
        <image href={asset.src} x={-width / 2} y={-plant.height + 4} width={width} height={plant.height} />
      )}
    </g>
  );
}
