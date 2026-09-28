import Image from "next/image";

import { avatarImage } from "@/components/app/avatars";
import { SPRU_FACES } from "@/components/spru/spru-assets";

/**
 * プレイヤーのアバター(docs/design/2026-09-29-spru-icons-design.md 4-9)。絵に色の輪が描いてあるので枠は付けない。
 * 絵の幅を size にそろえ、下を丸の下にそろえる(頭の芽は丸の上に出る)。selected は選んでいる印(外側の緑の輪)
 */
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
  const height = Math.round((asset.height * size) / asset.width);
  return (
    <span
      className={`relative flex shrink-0 items-end justify-center rounded-full ${
        selected ? "ring-4 ring-[#3b7f26] ring-offset-2 ring-offset-[#fffaf0]" : ""
      } ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={asset.src}
        alt=""
        width={size}
        height={height}
        style={{ width: size, height }}
        className="max-w-none drop-shadow-[0_3px_6px_rgba(59,50,38,0.2)]"
        aria-hidden
      />
    </span>
  );
}

/** 「じぶん」の絵(docs/design/2026-09-29-spru-icons-design.md 4-1・4-2)。プレイヤーがいればそのアバター、いなければスプルのふつうの顔 */
export function ProfileAvatar({ profile, size }: { profile: { avatar: string | null } | null; size: number }) {
  if (profile) return <AvatarBadge avatar={profile.avatar} size={size} />;
  const face = SPRU_FACES.normal;
  return (
    <Image
      src={face.src}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className="shrink-0 rounded-full bg-[#e3f3d6]"
      style={{ width: size, height: size }}
    />
  );
}
