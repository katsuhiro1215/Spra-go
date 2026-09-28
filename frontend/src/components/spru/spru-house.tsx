import Image from "next/image";

import { HOUSE_IMAGES } from "./spru-assets";

/**
 * スプルの家(入口の1枚の絵、設計書6-1)。幅を決めて出し、狭い画面では画面の幅に縮む。
 * 高さは縦横の比から決まる(枠に合わせて広げるので、Next.js の幅・高さの警告も出ない)
 */
export function SpruHouse({ width, eager = false, className }: { width: number; eager?: boolean; className?: string }) {
  const asset = HOUSE_IMAGES.home;
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: `min(${width}px, 100%)`, aspectRatio: `${asset.width} / ${asset.height}` }}
    >
      <Image
        src={asset.src}
        alt=""
        fill
        sizes={`${width}px`}
        loading={eager ? "eager" : undefined}
        className="object-contain"
        aria-hidden
      />
    </div>
  );
}
