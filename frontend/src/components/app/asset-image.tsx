import Image from "next/image";

import { fixedImageSize } from "@/components/app/image-size";
import type { SpruImage } from "@/components/spru/spru-assets";

/**
 * 切り抜いたスプルの絵を、高さ(size)を決めて出す(docs/design/2026-09-29-spru-icons-design.md 4章)。
 * alt がなければ飾り。flip は左右反転(左向きの乗り物を右向きにする)
 */
export function AssetImage({
  asset,
  size,
  className,
  alt,
  flip = false,
}: {
  asset: SpruImage;
  size: number;
  className?: string;
  alt?: string;
  flip?: boolean;
}) {
  const { width, height } = fixedImageSize(asset, size);
  return (
    <Image
      src={asset.src}
      alt={alt ?? ""}
      width={width}
      height={height}
      aria-hidden={alt ? undefined : true}
      className={`shrink-0 ${flip ? "-scale-x-100" : ""} ${className ?? ""}`}
      style={{ width, height }}
    />
  );
}
