"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/app/hp-gauge";
import { PointsBadge } from "@/components/app/points-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";

type HeaderProfile = {
  name: string;
  hp: number;
  max_hp: number;
  coins: number;
  current_streak: number;
};

/**
 * ゲーム内の全画面共通ヘッダー。以前はホーム画面のみに存在し、クイズ等の
 * 画面遷移で消えてしまっていたため、各ページで個別に読み込む共通コンポーネント
 * にした(RootLayoutに置かないのは、ログイン前/マーケティングページでは
 * 表示したくないため)。プロフィール情報は自前で取得する。
 */
export function AppHeader() {
  const router = useRouter();
  const [profile, setProfile] = useState<HeaderProfile | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/profiles/active")
      .then(async (res) => {
        if (!active || !res.ok) return;
        const data = await res.json();
        if (active) setProfile(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/10 px-4 backdrop-blur-sm sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-bold text-white drop-shadow"
      >
        <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
        SpraGo
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {typeof profile?.current_streak === "number" &&
          profile.current_streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full border border-orange-300/40 bg-orange-500/20 px-2 py-1 text-xs font-bold text-orange-200"
              title="連続プレイ日数"
            >
              🔥{profile.current_streak}日
            </span>
          )}
        <PointsBadge value={profile?.coins ?? 0} />
        <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} />
        <Link
          href="/passport"
          aria-label="マイパスポート"
          className="rounded-full border border-white/30 bg-black/20 p-1.5 text-lg leading-none shadow backdrop-blur-sm hover:bg-black/30"
        >
          📔
        </Link>
        <Link
          href="/shop"
          aria-label="ショップ"
          className="rounded-full border border-white/30 bg-black/20 p-1.5 text-lg leading-none shadow backdrop-blur-sm hover:bg-black/30"
        >
          🛒
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="プロフィールメニュー"
              className="rounded-full outline-none ring-white/60 focus-visible:ring-2"
            >
              <Avatar className="border-2 border-white/50">
                <AvatarFallback className="bg-sky-500 font-semibold text-white">
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
