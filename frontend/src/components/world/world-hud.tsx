import Image from "next/image";
import Link from "next/link";
import { Heart, Sprout } from "lucide-react";

import type { WorldProfile } from "./types";

export function WorldHud({
  name,
  profile,
  nextUnlock,
}: {
  name: string;
  profile: WorldProfile;
  nextUnlock: string | null;
}) {
  // レベルはXP100ごとに上がる(UserProfile::applyEconomy)
  const xpInLevel = profile.xp % 100;

  return (
    <header className="rounded-b-[22px] bg-[#fffaf0] px-3.5 pt-2.5 pb-2.5 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
      <div className="flex h-9 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[22px] font-bold text-[#2f4a22]">
          <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
          SpraGo
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-[#fdecea] px-2.5 py-1 text-sm font-semibold text-[#8a2c22]">
            <Heart className="h-4 w-4 fill-[#e5533f] text-[#e5533f]" aria-hidden />
            <span className="sr-only">HP</span>
            {profile.hp}/{profile.max_hp}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#eef7e6] px-2.5 py-1 text-[15px] font-bold text-[#2e6b1c]">
            <Sprout className="h-4 w-4" aria-hidden />
            <span className="sr-only">学習ポイント</span>
            {profile.points.toLocaleString()}
            <span className="text-[11px]">pt</span>
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#7cc35a] bg-[#e3f3d6]">
          <Image src="/spru/front.png" alt="" width={40} height={40} className="h-10 w-10 object-cover object-[50%_40%]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-black">{name}</span>
            <span className="rounded-full bg-[#3b7f26] px-2 text-xs font-bold text-white">Lv.{profile.level}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[#efe5cf]"
            role="progressbar"
            aria-label="次のレベルまで"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={xpInLevel}
          >
            <div className="h-2 rounded-full bg-[#5bb33e] transition-[width] duration-500" style={{ width: `${xpInLevel}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-[11.5px] font-bold text-[#6b5d45]">
            <span className="truncate">{nextUnlock ?? ""}</span>
            <span className="shrink-0">あと {100 - xpInLevel} XP</span>
          </div>
        </div>
      </div>
    </header>
  );
}
