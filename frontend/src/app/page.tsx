"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { Furigana } from "@/components/app/furigana";
import { SceneBackground } from "@/components/app/scene-background";
import { WorldMap } from "@/components/app/world-map";
import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Country = {
  id: number;
  code: string;
  name: string;
  is_suggested?: boolean;
};

type Status = "checking" | "guest" | "ready";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [pickerView, setPickerView] = useState<"flags" | "map">("flags");
  const [miniAppOpen, setMiniAppOpen] = useState(false);

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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center gap-8 px-6 py-10 pb-24">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            どこから<Furigana text="冒険" reading="ぼうけん" />する？
          </h1>
          <p className="mt-1 text-sm text-white/85 drop-shadow">
            好きな国を選んでね
          </p>
        </div>

        {/* 表示切替: フラッグ/地図(デスクトップ幅のみ意味を持つが、押し間違い防止に常に表示) */}
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => setPickerView("flags")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
              pickerView === "flags"
                ? "bg-amber-400 text-amber-950"
                : "bg-black/25 text-white/80 hover:bg-black/35"
            }`}
          >
            🚩 フラッグ
          </button>
          <button
            type="button"
            onClick={() => setPickerView("map")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
              pickerView === "map"
                ? "bg-amber-400 text-amber-950"
                : "bg-black/25 text-white/80 hover:bg-black/35"
            }`}
          >
            🗺 地図
          </button>
        </div>

        {!countries ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : allCountries.length === 0 ? (
          <p className="text-sm text-white/85">
            まだ国が登録されていません。お楽しみに。
          </p>
        ) : (
          <>
            {/* モバイル: 常にグリッド表示(タップ精度の関係で地図は非対応) */}
            <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 md:hidden">
              {allCountries.map((country) => (
                <Link key={country.id} href={`/travel/${country.id}/start`}>
                  <AppButton
                    variant="default"
                    size="lg"
                    className="relative flex w-full items-center justify-center gap-2 shadow-lg"
                  >
                    {country.is_suggested && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-amber-950 shadow">
                        あなたの国?
                      </span>
                    )}
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

            {/* デスクトップ: フラッグ(円形)または地図、切替可能 */}
            <div className="hidden w-full max-w-3xl md:block">
              {pickerView === "map" ? (
                <>
                  <WorldMap
                    countries={allCountries}
                    onSelect={(country) =>
                      router.push(`/travel/${country.id}/start`)
                    }
                  />
                  <p className="mt-2 text-center text-xs text-white/70 drop-shadow">
                    色が付いている国をクリックしてね
                  </p>
                </>
              ) : (
                <div className="relative mx-auto aspect-square w-full max-w-xl">
                  <div className="absolute top-1/2 left-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
                  {allCountries.map((country, index) => {
                    const angle =
                      (2 * Math.PI * index) / allCountries.length -
                      Math.PI / 2;
                    const radius = 42;
                    const x = 50 + radius * Math.cos(angle);
                    const y = 50 + radius * Math.sin(angle);

                    return (
                      <Link
                        key={country.id}
                        href={`/travel/${country.id}/start`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        <AppButton
                          variant="default"
                          className="relative flex aspect-square h-24 w-24 flex-col items-center justify-center gap-1 rounded-full p-2 text-center text-xs leading-tight text-balance shadow-lg lg:h-28 lg:w-28 lg:text-sm"
                        >
                          {country.is_suggested && (
                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap text-amber-950 shadow">
                              あなたの国?
                            </span>
                          )}
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
              )}
            </div>
          </>
        )}
      </main>

      {/* ミニアプリ: 右端タブから引き出すドロワー(メインのアプリ選択を邪魔しない) */}
      <button
        type="button"
        onClick={() => setMiniAppOpen(true)}
        aria-label="ミニアプリを開く"
        className="fixed top-1/2 right-0 z-30 -translate-y-1/2 rounded-l-lg border border-r-0 border-white/30 bg-black/30 px-2 py-3 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/40"
        style={{ writingMode: "vertical-rl" }}
      >
        ミニアプリ
      </button>

      {miniAppOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="ミニアプリを閉じる"
            onClick={() => setMiniAppOpen(false)}
            className="flex-1 bg-black/50"
          />
          <div className="flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">ミニアプリ</h2>
              <button
                type="button"
                onClick={() => setMiniAppOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            {!categories ? (
              <p className="text-xs text-white/70">読み込み中...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {rootCategories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/play/${category.id}`}
                    onClick={() => setMiniAppOpen(false)}
                  >
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
        </div>
      )}

      <BottomNav />
    </div>
  );
}
