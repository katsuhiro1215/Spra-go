import Image from "next/image";

import { BADGE_IMAGES, type BadgeKey } from "@/components/spru/spru-assets";

/** バッジの画像(設計書4-2)。小さい所(20〜24px)は mascot-10、大きい所(40〜72px)は mascot-9 のキーを使う。alt がなければ飾り */
export function BadgeImage({ badge, size, className, alt }: { badge: BadgeKey; size: number; className?: string; alt?: string }) {
  const asset = BADGE_IMAGES[badge];
  return (
    <Image
      src={asset.src}
      alt={alt ?? ""}
      width={Math.round((asset.width * size) / asset.height)}
      height={size}
      aria-hidden={alt ? undefined : true}
      className={`shrink-0 ${className ?? ""}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
