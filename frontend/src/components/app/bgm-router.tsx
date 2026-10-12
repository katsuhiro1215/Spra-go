"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useSound } from "@/components/app/sound-provider";
import { bgmForPath } from "@/lib/bgm-route";

/** 画面を移ったときに、その画面に合うBGMへ切り替える(対応は lib/bgm-route.ts)。
 * クイズなど、画面が自分でBGMを決めるところ("page")は何もしない。 */
export function BgmRouter() {
  const pathname = usePathname();
  const { playBgm, stopBgm } = useSound();

  useEffect(() => {
    const kind = bgmForPath(pathname);
    if (kind === "none") stopBgm();
    else if (kind !== "page") playBgm(kind);
  }, [pathname, playBgm, stopBgm]);

  return null;
}
