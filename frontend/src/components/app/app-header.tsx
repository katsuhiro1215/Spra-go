"use client";

import Link from "next/link";

import { BadgeImage } from "@/components/app/badge-image";
import { HpGauge } from "@/components/app/hp-gauge";
import { LogoMark } from "@/components/app/logo-mark";
import { LearnPointsBadge } from "@/components/app/learn-points-badge";
import { PointsBadge } from "@/components/app/points-badge";
import { useProfile } from "@/components/app/profile-provider";

/**
 * ゲーム内の全画面共通ヘッダー(設計書4-1)。左にロゴのマーク、右に縦2段で体力ゲージと連続・ポイント・コイン。
 * プロフィールの切り替え・ログアウトは下のメニューの「じぶん」に移した。
 * RootLayoutに置かないのは、ログイン前/マーケティングページでは表示したくないため。
 * プロフィール情報は`ProfileProvider`から取得する(回答APIの結果がすぐに反映される)
 */
export function AppHeader() {
  const { profile } = useProfile();

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 pt-2 pb-1 sm:px-6">
      <Link
        href="/"
        aria-label="Spra Go"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
      >
        <LogoMark />
      </Link>

      <div className="flex w-[196px] flex-col items-end gap-1">
        <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} className="w-full" />
        <div className="flex items-center gap-1">
          {typeof profile?.current_streak === "number" && profile.current_streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] px-2 py-1 text-xs font-black whitespace-nowrap text-[#c2402c] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              title="連続プレイ日数"
            >
              <BadgeImage badge="streak" size={16} />
              {profile.current_streak}日
            </span>
          )}
          <LearnPointsBadge value={profile?.points ?? 0} />
          <PointsBadge value={profile?.coins ?? 0} />
        </div>
      </div>
    </header>
  );
}
