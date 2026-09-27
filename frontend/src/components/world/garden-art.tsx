import { GARDEN_IMAGES, type GardenImageKey } from "@/components/spru/spru-assets";

import type { GardenState } from "./types";

// 畑の芽の絵の高さ(SVGの単位)。大きな芽は小さな芽と同じ絵を大きく描く
const PLANT: Record<Exclude<GardenState, "empty">, { image: GardenImageKey; height: number }> = {
  seed: { image: "seed", height: 18 },
  sprout: { image: "sprout", height: 22 },
  sprout_big: { image: "sprout", height: 32 },
};

/** スプルの家の前の畑(原点=マスの中心)。土の畝に、水やりの回数に応じた種・芽を重ねる */
export function GardenArt({ state }: { state: GardenState }) {
  const plant = state === "empty" ? null : PLANT[state];
  const asset = plant ? GARDEN_IMAGES[plant.image] : null;
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
