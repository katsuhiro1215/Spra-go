"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { HpGauge } from "@/components/app/hp-gauge";
import { PointsBadge } from "@/components/app/points-badge";
import { SceneBackground } from "@/components/app/scene-background";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  xp: number;
  coins: number;
  level: number;
};

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Country = {
  id: number;
  code: string;
  name: string;
};

type Status = "checking" | "guest" | "ready";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [countries, setCountries] = useState<Country[] | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;

        if (!userRes.ok) {
          setStatus("guest");
          return;
        }

        const activeRes = await apiFetch("/api/profiles/active");
        if (!active) return;

        const activeProfile = await activeRes.json();
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }

        setProfile(activeProfile);
        setStatus("ready");

        const [categoriesRes, countriesRes] = await Promise.all([
          apiFetch("/api/categories"),
          apiFetch("/api/countries"),
        ]);
        if (!active) return;
        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
        if (countriesRes.ok) {
          setCountries(await countriesRes.json());
        }
      })
      .catch(() => {
        if (active) setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" });
    router.replace("/login");
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <SceneBackground />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              SpraGo
            </h1>
            <p className="mt-2 text-sm text-white/85 drop-shadow">
              興味が世界を広げ、世界が言葉を教えてくれる。
            </p>
          </div>

          <CharacterPlaceholder className="h-40 w-40" />

          <div className="flex flex-col items-center gap-3">
            <Link href="/register">
              <AppButton variant="primary" size="lg" className="shadow-lg">
                はじめる
              </AppButton>
            </Link>
            <Link
              href="/login"
              className="text-sm text-white/85 drop-shadow hover:underline"
            >
              すでにアカウントをお持ちの方はこちら
            </Link>
          </div>

          <div className="mt-2 flex flex-col items-center gap-2">
            <p className="text-xs text-white/70">
              登録なしでミニクイズを試す
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { code: "jp", name: "日本" },
                { code: "us", name: "アメリカ" },
                { code: "gb", name: "イギリス" },
                { code: "fr", name: "フランス" },
              ].map((country) => (
                <Link key={country.code} href={`/world/${country.code}`}>
                  <AppButton variant="ghost" size="sm" className="text-white">
                    {country.name}
                  </AppButton>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rootCategories = (categories ?? []).filter(
    (c) => c.parent_id === null,
  );
  const allCountries = countries ?? [];
  const total = allCountries.length;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />

      <header className="relative z-10 flex h-14 items-center justify-between border-b border-white/10 bg-black/10 px-4 backdrop-blur-sm sm:px-6">
        <span className="text-lg font-bold text-white drop-shadow">
          SpraGo
        </span>

        <div className="flex items-center gap-2 sm:gap-3">
          <PointsBadge value={profile?.coins ?? 0} />
          <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} />
          <Link
            href="/shop"
            aria-label="ショップ"
            className="rounded-full border border-white/30 bg-black/20 p-1.5 text-lg leading-none shadow backdrop-blur-sm hover:bg-black/30"
          >
            🛒
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-white/60 focus-visible:ring-2">
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
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-10 px-6 py-10 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-1 flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              どこから冒険する？
            </h1>
            <p className="mt-1 text-sm text-white/85 drop-shadow">
              好きな国を選んでね
            </p>
          </div>

          {!countries ? (
            <p className="text-sm text-white/85">読み込み中...</p>
          ) : allCountries.length === 0 ? (
            <p className="text-sm text-white/85">
              まだ国が登録されていません。お楽しみに。
            </p>
          ) : (
            <>
              {/* モバイル: グリッド表示 */}
              <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 md:hidden">
                {allCountries.map((country) => (
                  <Link key={country.id} href={`/travel/${country.id}`}>
                    <AppButton
                      variant="default"
                      size="lg"
                      className="flex w-full items-center justify-center gap-2 shadow-lg"
                    >
                      <span className="relative h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-white/40">
                        <Image
                          src={`/flag/${country.code}.svg`}
                          alt={country.name}
                          fill
                          className="object-cover"
                        />
                      </span>
                      {country.name}
                    </AppButton>
                  </Link>
                ))}
              </div>

              {/* デスクトップ: 円形に配置 */}
              <div className="relative mx-auto hidden aspect-square w-full max-w-xl md:block">
                <div className="absolute top-1/2 left-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
                {allCountries.map((country, index) => {
                  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
                  const radius = 42;
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);

                  return (
                    <Link
                      key={country.id}
                      href={`/travel/${country.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      <AppButton
                        variant="default"
                        className="flex aspect-square h-24 w-24 flex-col items-center justify-center gap-1 rounded-full p-2 text-center text-xs leading-tight text-balance shadow-lg lg:h-28 lg:w-28 lg:text-sm"
                      >
                        <span className="relative h-6 w-9 shrink-0 overflow-hidden rounded-sm border border-white/40">
                          <Image
                            src={`/flag/${country.code}.svg`}
                            alt={country.name}
                            fill
                            className="object-cover"
                          />
                        </span>
                        {country.name}
                      </AppButton>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ミニアプリ */}
        <div className="flex w-full flex-col gap-3 lg:w-56 lg:shrink-0">
          <h2 className="text-center text-sm font-semibold text-white/90 drop-shadow lg:text-left">
            ミニアプリ
          </h2>
          {!categories ? (
            <p className="text-center text-xs text-white/70 lg:text-left">
              読み込み中...
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {rootCategories.map((category, index) => (
                <Link key={category.id} href={`/play/${category.id}`}>
                  <AppButton
                    variant={tileVariants[index % tileVariants.length]}
                    size="sm"
                    className="w-full shadow"
                  >
                    {category.name}
                  </AppButton>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <AppButton
        variant="default"
        aria-label="ヘルプ"
        className="fixed right-6 bottom-6 z-20 h-12 w-12 rounded-full text-lg shadow-lg"
      >
        ?
      </AppButton>
    </div>
  );
}
