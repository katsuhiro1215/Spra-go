"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen, SpruLoading } from "@/components/app/spru-loading";
import { ArrivedCountryCard, LockedCountryCard } from "@/components/learn/country-card";
import { learnSections, type LearnCountry } from "@/components/learn/country-cards";
import { LockedCountrySheet } from "@/components/travel/locked-country";
import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Status = "checking" | "ready";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

// 国旗のカードの並び(docs/design/2026-09-29-learn-flag-cards-design.md 3-1)。スマホ2列・パソコン3列
const CARD_GRID_CLASS = "grid grid-cols-2 gap-4 md:grid-cols-3";

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [countries, setCountries] = useState<LearnCountry[] | null>(null);
  const [miniAppOpen, setMiniAppOpen] = useState(false);
  const [lockedCountry, setLockedCountry] = useState<LearnCountry | null>(null);

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
  const { arrived, notYet } = learnSections(countries ?? []);

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

        {!countries ? (
          <SpruLoading />
        ) : countries.length === 0 ? (
          <SkyText muted className="text-sm">
            まだ国が登録されていません。お楽しみに。
          </SkyText>
        ) : (
          <div className="flex w-full max-w-3xl flex-col gap-8">
            {arrived.length > 0 && (
              <section className="flex flex-col gap-3">
                <SkyTitle as="h2" className="text-lg">
                  <AutoFurigana text="着いた国" />
                </SkyTitle>
                <div className={CARD_GRID_CLASS}>
                  {arrived.map((country) => (
                    <ArrivedCountryCard key={country.id} country={country} />
                  ))}
                </div>
              </section>
            )}
            {notYet.length > 0 && (
              <section className="flex flex-col gap-3">
                <div>
                  <SkyTitle as="h2" className="text-lg">
                    <AutoFurigana text="まだの国" />
                  </SkyTitle>
                  <SkyText muted className="mt-0.5 text-xs">
                    <AutoFurigana text="せかいでチケットを使うと行けるよ" />
                  </SkyText>
                </div>
                <div className={CARD_GRID_CLASS}>
                  {notYet.map((country) => (
                    <LockedCountryCard key={country.id} country={country} onSelect={() => setLockedCountry(country)} />
                  ))}
                </div>
              </section>
            )}
          </div>
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
