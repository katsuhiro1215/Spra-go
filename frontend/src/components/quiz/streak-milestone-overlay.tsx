"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BadgeImage } from "@/components/app/badge-image";
import { SpruFigure } from "@/components/spru/spru-figure";

import { streakMilestoneBadge, streakMilestoneLine } from "./streak-milestone";

/** 連続プレイの節目(3日・7日・30日)の全画面のお祝い(設計書4-3)。見た目は LevelUpOverlay にそろえる */
export function StreakMilestoneOverlay({
  days,
  first,
  bonusCoin,
  onContinue,
}: {
  days: number;
  first: boolean;
  bonusCoin: number;
  onContinue: () => void;
}) {
  const badge = streakMilestoneBadge(days);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-milestone-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-end gap-2">
          {badge && <BadgeImage badge={badge} size={120} className="animate-pop-in" />}
          <SpruFigure image="cheer" standHeight={72} />
        </div>
        <h2 id="streak-milestone-title" className="text-2xl font-black text-[#c2402c]">
          <AutoFurigana text={`${days}日連続プレイ！`} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={streakMilestoneLine(days, first)} />
        </p>
        {bonusCoin > 0 && (
          <p className="text-sm font-black text-[#7a5a0e]">ボーナス +{bonusCoin}Coin</p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
