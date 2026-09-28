import Image from "next/image";

import { fixedImageSize } from "@/components/app/image-size";

// public/logo.svg の viewBox の縦横
const LOGO = { width: 215.73, height: 207.86 };

/** ロゴのマーク(飾り。リンクの名前は親の aria-label で付ける) */
export function LogoMark({ size = 28 }: { size?: number }) {
  const { width, height } = fixedImageSize(LOGO, size);
  return <Image src="/logo.svg" alt="" width={width} height={height} style={{ width, height }} aria-hidden />;
}
