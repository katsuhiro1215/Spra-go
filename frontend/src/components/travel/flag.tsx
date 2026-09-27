import Image from "next/image";

/** 旅の画面の国旗。src は API の flag(設定のファイル名から作ったパス) */
export function Flag({ src, size = 24 }: { src: string; size?: number }) {
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-[3px] border border-white/60 shadow-sm"
      style={{ width: size, height: Math.round((size * 2) / 3) }}
    >
      <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
