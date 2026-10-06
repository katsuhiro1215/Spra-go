"use client";

import { useState } from "react";
import Link from "next/link";

import { BadgeImage } from "@/components/app/badge-image";
import { CurrencyIcon } from "@/components/app/currency-icon";
import { HpGauge } from "@/components/app/hp-gauge";
import { LevelRing } from "@/components/app/level-ring";
import { LogoMark } from "@/components/app/logo-mark";
import { useProfile } from "@/components/app/profile-provider";
import { StatusSheet } from "@/components/app/status-sheet";

/**
 * ゲーム内の全画面共通ヘッダー(設計書4-1、docs/design/2026-10-07-header-level-design.md 5-1章)。
 * 左にロゴのマーク。右は縦2段で、上にレベルの輪と体力ゲージ、下に連続日数と学習ポイント・コインの絵(数字は出さない)。
 * 輪を押すと「じぶんの状態」が開く。プロフィールの切り替え・ログアウトは下のメニューの「じぶん」にある。
 * RootLayoutに置かないのは、ログイン前/マーケティングページでは表示したくないため。
 * プロフィール情報は`ProfileProvider`から取得する(回答APIの結果がすぐに反映される)
 */
export function AppHeader() {
  const { profile } = useProfile();
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <header className="relative z-30 flex shrink-0 items-start justify-between gap-3 px-3 pt-2 pb-1 sm:px-6">
      <Link
        href="/"
        aria-label="Spra Go"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
      >
        <LogoMark />
      </Link>

      <div className="flex w-[204px] flex-col items-end gap-1">
        <div className="flex w-full items-center gap-1.5">
          <LevelRing level={profile?.level ?? 1} xp={profile?.xp ?? 0} range={profile?.level_xp} onClick={() => setStatusOpen(true)} />
          <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} className="min-w-0 flex-1" />
        </div>
        <div className="flex items-center gap-1">
          {typeof profile?.current_streak === "number" && profile.current_streak > 0 && (
            <span
              className="flex h-7 items-center gap-1 rounded-full bg-[#fffaf0] px-2 text-xs font-black whitespace-nowrap text-[#c2402c] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              title="連続プレイ日数"
            >
              <BadgeImage badge="streak" size={16} />
              {profile.current_streak}日
            </span>
          )}
          <CurrencyIcon kind="points" />
          <CurrencyIcon kind="coins" />
        </div>
      </div>
      <StatusSheet open={statusOpen} onOpenChange={setStatusOpen} />
    </header>
  );
}
