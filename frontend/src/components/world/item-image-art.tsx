import type { SpruImage } from "@/components/spru/spru-assets";

import { imagePlacement } from "./item-image";
import type { ItemImageFit } from "./item-image-fit";

/** 画像の物(設計書 2026-09-28-town-items 7章)。影はプログラムで同じ形を付ける */
export function ImageArt({ image, footprint, fit }: { image: SpruImage; footprint: number; fit?: ItemImageFit }) {
  const p = imagePlacement(image, footprint, fit);
  return (
    <g>
      <ellipse cx={0} cy={2} rx={20 * footprint} ry={8 * footprint} fill="#2f5d2a" opacity={0.15} />
      <image href={image.src} x={p.x} y={p.y} width={p.width} height={p.height} />
    </g>
  );
}
