"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Lock, Map as MapIcon } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { Panel } from "@/components/app/panel";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen, SpruLoading } from "@/components/app/spru-loading";
import { WorldMap } from "@/components/app/world-map";
import { LockedCountrySheet } from "@/components/travel/locked-country";
import { unlockedCountries } from "@/components/travel/travel";
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
  locked: boolean;
};

type Status = "checking" | "ready";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [pickerView, setPickerView] = useState<"flags" | "map">("flags");
  const [miniAppOpen, setMiniAppOpen] = useState(false);
  const [lockedCountry, setLockedCountry] = useState<Country | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;

        if (!userRes.ok) {
          router.replace("/login");
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
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "checking") {
    return (
      <LoadingScreen />
    );
  }

  const rootCategories = (categories ?? []).filter(
    (c) => c.parent_id === null,
  );
  const allCountries = countries ?? [];

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center gap-8 px-6 py-10 pb-24">
        <div className="text-center">
          <SkyTitle className="text-3xl">
            どこから<Furigana text="冒険" reading="ぼうけん" />する？
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            着いた国で学べるよ
          </SkyText>
        </div>

        {/* 表示切替: フラッグ/地図(デスクトップ幅のみ意味を持つが、押し間違い防止に常に表示) */}
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => setPickerView("flags")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
              pickerView === "flags"
                ? "bg-[#3b7f26] text-white"
                : "bg-[#fffaf0] text-[#3b3226] hover:bg-white"
            }`}
          >
            <Flag aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            フラッグ
          </button>
          <button
            type="button"
            onClick={() => setPickerView("map")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
              pickerView === "map"
                ? "bg-[#3b7f26] text-white"
                : "bg-[#fffaf0] text-[#3b3226] hover:bg-white"
            }`}
          >
            <MapIcon aria-hidden className="mr-1 inline h-3.5 w-3.5" />
            地図
          </button>
        </div>

        {!countries ? (
          <SpruLoading />
        ) : allCountries.length === 0 ? (
          <SkyText muted className="text-sm">
            まだ国が登録されていません。お楽しみに。
          </SkyText>
        ) : (
          <>
            {/* モバイル: 常にグリッド表示(タップ精度の関係で地図は非対応) */}
            <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 md:hidden">
              {allCountries.map((country) =>
                country.locked ? (
                  <AppButton
                    key={country.id}
                    variant="locked"
                    size="lg"
                    aria-label={`${country.name}(まだの国)`}
                    onClick={() => setLockedCountry(country)}
                    className="flex w-full items-center justify-center gap-2 shadow-lg"
                  >
                    <Lock aria-hidden className="h-4 w-4 shrink-0" />
                    <FlagThumb code={country.code} className="h-4 w-6 grayscale" />
                    {country.name}
                  </AppButton>
                ) : (
                  <Link key={country.id} href={`/travel/${country.id}/start`}>
                    <AppButton variant="default" size="lg" className="flex w-full items-center justify-center gap-2 shadow-lg">
                      <FlagThumb code={country.code} className="h-4 w-6" />
                      {country.name}
                    </AppButton>
                  </Link>
                ),
              )}
            </div>

            {/* デスクトップ: フラッグ(円形)または地図、切替可能 */}
            <div className="hidden w-full max-w-3xl md:block">
              {pickerView === "map" ? (
                <>
                  <Panel className="p-3">
                    <WorldMap
                      countries={unlockedCountries(allCountries)}
                      onSelect={(country) =>
                        router.push(`/travel/${country.id}/start`)
                      }
                    />
                  </Panel>
                  <SkyText muted className="mt-2 text-center text-xs">
                    色が付いている国をクリックしてね
                  </SkyText>
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

                    const position = { left: `${x}%`, top: `${y}%` };
                    const circleClass =
                      "flex aspect-square h-24 w-24 flex-col items-center justify-center gap-1 rounded-full p-2 text-center text-xs leading-tight text-balance shadow-lg lg:h-28 lg:w-28 lg:text-sm";
                    return country.locked ? (
                      <AppButton
                        key={country.id}
                        variant="locked"
                        aria-label={`${country.name}(まだの国)`}
                        onClick={() => setLockedCountry(country)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 ${circleClass}`}
                        style={position}
                      >
                        <Lock aria-hidden className="h-4 w-4" />
                        <FlagThumb code={country.code} className="h-6 w-9 grayscale" />
                        {country.name}
                      </AppButton>
                    ) : (
                      <Link
                        key={country.id}
                        href={`/travel/${country.id}/start`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={position}
                      >
                        <AppButton variant="default" className={circleClass}>
                          <FlagThumb code={country.code} className="h-6 w-9" />
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
        className="fixed top-1/2 right-0 z-30 -translate-y-1/2 rounded-l-xl bg-[#fffaf0] px-2 py-3 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.2)] hover:bg-white"
      >
        ◀
      </button>

      {miniAppOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="ミニアプリを閉じる"
            onClick={() => setMiniAppOpen(false)}
            className="flex-1 bg-[rgba(38,48,28,0.38)]"
          />
          <div className="flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-[#fffaf0] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#3b3226]">ミニアプリ</h2>
              <button
                type="button"
                onClick={() => setMiniAppOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1 text-[#6b5d45] hover:bg-[#f5efe1]"
              >
                ✕
              </button>
            </div>
            {!categories ? (
              <p className="text-xs text-[#6b5d45]">読み込み中...</p>
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

      {lockedCountry && <LockedCountrySheet name={lockedCountry.name} onClose={() => setLockedCountry(null)} />}

      <BottomNav />
    </SkyPage>
  );
}

/** 国のボタンの中の国旗(国名の文字が横にあるので alt は空) */
function FlagThumb({ code, className }: { code: string; className: string }) {
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-sm border border-[#e8dfcf] ${className}`}>
      <Image src={`/flag/${code}.svg`} alt="" fill className="object-cover" />
    </span>
  );
}
