import Image from "next/image";
import Link from "next/link";
import { Backpack } from "lucide-react";

import { BadgeImage } from "@/components/app/badge-image";
import { LogoMark } from "@/components/app/logo-mark";
import { SPRU_FACES } from "@/components/spru/spru-assets";

import { growthLabel } from "./garden";
import type { WorldProfile } from "./types";

export function WorldHud({
  name,
  profile,
  growth,
  nextUnlock,
}: {
  name: string;
  profile: WorldProfile;
  growth: number;
  nextUnlock: string | null;
}) {
  // レベルの上がり方はサーバーが計算する(app/Support/LevelCurve.php)
  const { floor, next } = profile.level_xp;
  const progress = Math.min(100, Math.max(0, Math.round(((profile.xp - floor) / Math.max(1, next - floor)) * 100)));

  return (
    <header className="rounded-b-[22px] bg-[#fffaf0] px-3.5 pt-2.5 pb-2.5 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
      <div className="flex h-9 items-center justify-between">
        <Link href="/" aria-label="SpraGo" className="flex items-center">
          <LogoMark />
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-[#fdecea] px-2.5 py-1 text-sm font-semibold text-[#8a2c22]">
            <BadgeImage badge="hp" size={18} />
            <span className="sr-only">HP</span>
            {profile.hp}/{profile.max_hp}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#eef7e6] px-2.5 py-1 text-[15px] font-bold text-[#2e6b1c]">
            <BadgeImage badge="points" size={18} />
            <span className="sr-only">学習ポイント</span>
            {profile.points.toLocaleString()}
            <span className="text-[11px]">pt</span>
          </span>
          <Link
            href="/bag"
            aria-label="バッグ"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5efe1] text-[#6b5d45]"
          >
            <Backpack aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#7cc35a] bg-[#e3f3d6]">
          <Image src={SPRU_FACES.normal.src} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-black">{name}</span>
            <span className="rounded-full bg-[#3b7f26] px-2 text-xs font-bold text-white">Lv.{profile.level}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[#efe5cf]"
            role="progressbar"
            aria-label="次に育つまで"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-2 rounded-full bg-[#5bb33e] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-[11.5px] font-bold text-[#6b5d45]">
            <span className="truncate">{nextUnlock ?? ""}</span>
            <span className="shrink-0">{growthLabel(growth, profile.xp, profile.level_xp)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
