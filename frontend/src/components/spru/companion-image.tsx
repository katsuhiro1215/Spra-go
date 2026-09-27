import Image from "next/image";

import { COMPANION_IMAGES, SPRU_STAND_HEIGHT, type CompanionKey } from "./spru-assets";

/**
 * HTMLの中で仲間を出す(クイズ・仲間のカード用)。standHeight はスプルの立ち姿の高さ(px)で、
 * 仲間は素材集の縮尺どおり、スプルより少し小さく描く
 */
export function CompanionImage({
  companionKey,
  standHeight,
  className,
}: {
  companionKey: string;
  standHeight: number;
  className?: string;
}) {
  if (!(companionKey in COMPANION_IMAGES)) return null;
  const asset = COMPANION_IMAGES[companionKey as CompanionKey];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round(asset.width * scale)}
      height={Math.round(asset.height * scale)}
      aria-hidden
      className={className}
    />
  );
}
