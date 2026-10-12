import type { SpruImage } from "@/components/spru/spru-assets";

import { imagePlacement } from "./item-image";
import type { ItemImageFit } from "./item-image-fit";

/** 画像の物(設計書 2026-09-28-town-items 7章)。影はプログラムで同じ形を付ける */
export function ImageArt({ image, footprint, fit, mirrored = false }: { image: SpruImage; footprint: number; fit?: ItemImageFit; mirrored?: boolean }) {
  const p = imagePlacement(image, footprint, fit);
  return (
    <g>
      <ellipse cx={0} cy={2} rx={20 * footprint} ry={8 * footprint} fill="#2f5d2a" opacity={0.15} />
      {/* 左右反転は、足元の真ん中(原点)を軸にする */}
      <image href={image.src} x={p.x} y={p.y} width={p.width} height={p.height} transform={mirrored ? "scale(-1 1)" : undefined} />
    </g>
  );
}
