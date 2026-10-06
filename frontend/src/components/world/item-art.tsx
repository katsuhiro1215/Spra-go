import type { ReactNode } from "react";

import { SPRU_BLOOM } from "@/components/spru/spru-assets";

import { assetFootprint } from "./art-keys";
import { iconViewBox, imagePlacement, itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT } from "./item-image-fit";

// 原点(0,0)がマスの中心(地面に接する点)。アイテム・おみやげは SPRU_ITEMS の画像で描く(docs/design/2026-09-28-town-items-design.md 7章)。
// 夜の光の輪は町の側で重ねる(world-scene.tsx・lightCircles)

// 種から咲いた「スプルの花」(非売品)。花は素材集の切り抜き
const SPRU_FLOWER: ReactNode = (
  <g>
    <ellipse cx={0} cy={2} rx={11} ry={4.5} fill="#2f5d2a" opacity={0.15} />
    <path d="M0 2 C-1.5 -8 1.5 -14 0 -22" stroke="#5a9e3a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
    <ellipse cx={-5} cy={-9} rx={5} ry={2.4} fill="#74b35d" transform="rotate(-25 -5 -9)" />
    <ellipse cx={5} cy={-14} rx={5} ry={2.4} fill="#86c56d" transform="rotate(25 5 -14)" />
    <image href={SPRU_BLOOM.flower.src} x={-11} y={-36} width={22} height={26} />
  </g>
);

// 画像のないキーでも画面が壊れないようにする代わりの絵(プレゼント箱)
const FALLBACK: ReactNode = (
  <g>
    <ellipse cx={0} cy={2} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
    <polygon points="-12,-2 0,4 0,-12 -12,-18" fill="#f2b632" />
    <polygon points="0,4 12,-2 12,-18 0,-12" fill="#d4960e" />
    <polygon points="-12,-18 0,-12 12,-18 0,-24" fill="#ffd35c" />
    <path d="M-6 -21 L6 -15 M0 -12 V4" stroke="#e5533f" strokeWidth={2} />
  </g>
);

export function ItemArt({ assetKey }: { assetKey: string | null }) {
  const image = itemImage(assetKey);
  if (image && assetKey) {
    return <ImageArt image={image} footprint={assetFootprint(assetKey)} fit={ITEM_IMAGE_FIT[assetKey]} />;
  }
  return <>{assetKey === "spru_flower" ? SPRU_FLOWER : FALLBACK}</>;
}

export function ItemIcon({
  assetKey,
  size = 56,
  className,
}: {
  assetKey: string | null;
  size?: number;
  className?: string;
}) {
  const image = itemImage(assetKey);
  // 画像の物は画像の範囲に合わせる。スプルの花・プレゼント箱は1マスの範囲
  const viewBox =
    image && assetKey
      ? iconViewBox(imagePlacement(image, assetFootprint(assetKey), ITEM_IMAGE_FIT[assetKey]))
      : "-34 -62 68 72";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
