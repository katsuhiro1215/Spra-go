import Image from "next/image";

import { avatarImage } from "@/components/app/avatars";
import { fixedImageSize } from "@/components/app/image-size";

/** プレイヤーのアバター(丸い枠、設計書6-2)。絵は枠の下にそろえる。selected は選んでいる印(緑の輪) */
export function AvatarBadge({
  avatar,
  size,
  selected = false,
  className,
}: {
  avatar: string | null;
  size: number;
  selected?: boolean;
  className?: string;
}) {
  const asset = avatarImage(avatar);
  const { width, height } = fixedImageSize(asset, Math.round(size * 0.88));
  return (
    <span
      className={`flex shrink-0 items-end justify-center overflow-hidden rounded-full border-[3px] bg-[#fff4df] shadow-[0_4px_10px_rgba(59,50,38,0.18)] ${
        selected ? "border-[#3b7f26] ring-4 ring-[#9fd8a0]" : "border-[#fffaf0]"
      } ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image src={asset.src} alt="" width={width} height={height} style={{ width, height }} aria-hidden />
    </span>
  );
}
