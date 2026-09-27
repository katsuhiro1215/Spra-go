"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeImage } from "@/components/app/badge-image";
import { HpGauge } from "@/components/app/hp-gauge";
import { LearnPointsBadge } from "@/components/app/learn-points-badge";
import { PointsBadge } from "@/components/app/points-badge";
import { useProfile } from "@/components/app/profile-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";

/**
 * ゲーム内の全画面共通ヘッダー。以前はホーム画面のみに存在し、クイズ等の
 * 画面遷移で消えてしまっていたため、各ページで個別に読み込む共通コンポーネント
 * にした(RootLayoutに置かないのは、ログイン前/マーケティングページでは
 * 表示したくないため)。プロフィール情報は`ProfileProvider`(RootLayoutに設置、
 * 全画面で共有)から取得する。以前は自前fetchだったため、クイズで回答して
 * HPが変わってもヘッダーに反映されない不具合があった(2026-07-31修正)。
 */
export function AppHeader() {
  const router = useRouter();
  const { profile } = useProfile();

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between px-3 sm:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 rounded-full bg-[#fffaf0] py-1 pr-1.5 pl-1.5 text-base font-black text-[#2e6b1c] shadow-[0_2px_6px_rgba(59,50,38,0.15)] sm:pr-3"
        aria-label="SpraGo"
      >
        <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
        {/* 学習ポイントの表示を足したため、スマホ幅では文字を省いてアバター(プロフィール切替・ログアウト)が押し出されないようにする */}
        <span className="hidden sm:inline">SpraGo</span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {typeof profile?.current_streak === "number" &&
          profile.current_streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] px-2 py-1 text-xs font-black whitespace-nowrap text-[#c2402c] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              title="連続プレイ日数"
            >
              <BadgeImage badge="streak" size={18} />
              {profile.current_streak}日
            </span>
          )}
        <LearnPointsBadge value={profile?.points ?? 0} />
        <PointsBadge value={profile?.coins ?? 0} />
        <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="プロフィールメニュー"
              className="rounded-full outline-none ring-[#2b6fa3] focus-visible:ring-2"
            >
              <Avatar className="border-2 border-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]">
                <AvatarFallback className="bg-[#2b6fa3] font-black text-white">
                  {profile?.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profiles">プロフィール切替</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>ヘルプ（準備中）</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
