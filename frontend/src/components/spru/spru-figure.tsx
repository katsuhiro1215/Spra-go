import Image from "next/image";

import { bloomRect, type Bloom } from "./bloom";
import {
  SPRU_BLOOM,
  SPRU_FACES,
  SPRU_IMAGES,
  SPRU_STAND_HEIGHT,
  type SpruFaceKey,
  type SpruImageKey,
} from "./spru-assets";

/**
 * HTMLの中でスプルを出す(クイズ・演出用)。standHeight は立ち姿のときの高さ(px)で、
 * 座る・寝るなどほかの画像は素材集の縮尺どおりに大きさをそろえる。bloom はSの先のつぼみ・花
 */
export function SpruFigure({
  image,
  standHeight,
  bloom = null,
  alt = "",
  className,
}: {
  image: SpruImageKey;
  standHeight: number;
  bloom?: Bloom | null;
  alt?: string;
  className?: string;
}) {
  const asset = SPRU_IMAGES[image];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  const width = Math.round(asset.width * scale);
  const height = Math.round(asset.height * scale);
  const rect = bloom ? bloomRect(image, bloom) : null;
  const figure = (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={height}
      className={rect ? undefined : className}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
  if (!bloom || !rect) return figure;
  // 跳ねるなどの動きは、花も一緒に動くよう外側の箱に付ける
  return (
    <span className={`relative inline-block ${className ?? ""}`} style={{ width, height }}>
      {figure}
      <Image
        src={SPRU_BLOOM[bloom].src}
        alt=""
        width={Math.round(rect.width * scale)}
        height={Math.round(rect.height * scale)}
        aria-hidden
        className="absolute"
        style={{ left: rect.x * scale, top: rect.y * scale }}
      />
    </span>
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
