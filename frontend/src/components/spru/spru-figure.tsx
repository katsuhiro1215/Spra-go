import Image from "next/image";

import { SPRU_FACES, SPRU_IMAGES, SPRU_STAND_HEIGHT, type SpruFaceKey, type SpruImageKey } from "./spru-assets";

/**
 * HTMLの中でスプルを出す(クイズ・演出用)。standHeight は立ち姿のときの高さ(px)で、
 * 座る・寝るなどほかの画像は素材集の縮尺どおりに大きさをそろえる
 */
export function SpruFigure({
  image,
  standHeight,
  alt = "",
  className,
}: {
  image: SpruImageKey;
  standHeight: number;
  alt?: string;
  className?: string;
}) {
  const asset = SPRU_IMAGES[image];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={Math.round(asset.width * scale)}
      height={Math.round(asset.height * scale)}
      className={className}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}

/** 丸い顔アイコン(吹き出しの横・アバター用) */
export function SpruFace({ face, size, className }: { face: SpruFaceKey; size: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-[#fff4df] ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image src={SPRU_FACES[face].src} alt="" width={size} height={size} aria-hidden />
    </span>
  );
}
