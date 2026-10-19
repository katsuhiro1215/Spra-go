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
import { daysLeft, limitedGame, listedGames, newGameNotices, readDismissed, todayJst, writeDismissed, type RolloutGame } from "@/lib/mini-app";

type Status = "checking" | "ready";

// 国旗のカードの並び(docs/design/2026-09-29-learn-flag-cards-design.md 3-1)。スマホ2列・パソコン3列
const CARD_GRID_CLASS = "grid grid-cols-2 gap-4 md:grid-cols-3";

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [rolloutGames, setRolloutGames] = useState<RolloutGame[] | null>(null);
  const [dismissedGames, setDismissedGames] = useState<string[]>([]);
  const [countries, setCountries] = useState<LearnCountry[] | null>(null);
  const [today] = useState(() => todayJst());
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

        setDismissedGames(readDismissed(typeof window === "undefined" ? null : window.localStorage));
        const [countriesRes, gamesRes] = await Promise.all([apiFetch("/api/countries"), apiFetch("/api/games")]);
        if (!active) return;
        setRolloutGames(gamesRes.ok ? await gamesRes.json() : []);
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

  const { arrived, notYet } = learnSections(countries ?? []);
  const games = listedGames(rolloutGames);
  const notices = newGameNotices(games, dismissedGames);
  const event = limitedGame(games);
  const eventLeft = event ? daysLeft(event.endsOn, today) : null;
  const dismissNotice = (key: string) => {
    const next = [...dismissedGames, key];
    setDismissedGames(next);
    writeDismissed(window.localStorage, next);
  };

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center gap-8 px-6 py-10 pb-24">
        {notices.map((game) => (
          <div key={game.key} className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-[#fffaf0] p-3 text-[#3b3226] shadow">
            <span aria-hidden className="text-2xl">🎮</span>
            <p className="flex-1 text-sm font-black">
              <AutoFurigana text="新しいミニゲームが出たよ！" />
              <br />
              <AutoFurigana text={game.title} />
            </p>
            <Link href={game.href}>
              <AppButton variant="warning" size="sm">
                <AutoFurigana text="あそぶ" />
              </AppButton>
            </Link>
            <button type="button" onClick={() => dismissNotice(game.key)} aria-label="閉じる" className="rounded-full p-1 text-[#6b5d45] hover:bg-[#f5efe1]">
              ✕
            </button>
          </div>
        ))}
        <div className="text-center">
          <SkyTitle className="text-3xl">
            どこから<Furigana text="冒険" reading="ぼうけん" />する？
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            <AutoFurigana text="着いた国で学べるよ" />
          </SkyText>
          <div className="mt-3 flex justify-center gap-3">
            <Link href="/words">
              <AppButton variant="warning" size="sm" className="shadow">
                📖 <AutoFurigana text="単語帳" />
              </AppButton>
            </Link>
            <Link href="/games" className="relative">
              <AppButton variant="warning" size="sm" className="shadow">
                🎮 <AutoFurigana text="ミニゲーム" />
              </AppButton>
              {notices.length > 0 && <span aria-hidden className="absolute -top-1 -right-1 size-3 rounded-full bg-[#d94a3a]" />}
            </Link>
          </div>
        </div>

        {event && (
          <Link href={event.href} className="w-full max-w-md">
            <div className="flex flex-col items-center gap-1 rounded-3xl bg-[#fff3c4] px-4 py-4 text-center text-[#3b3226] shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
              <span className="rounded-full bg-white px-3 py-0.5 text-xs font-black text-[#7a5a12]">
                <AutoFurigana text={eventLeft ? `期間限定　あと${eventLeft}日` : "期間限定"} />
              </span>
              <span className="text-xl font-black">
                <AutoFurigana text={event.title} />
              </span>
              <span className="text-sm font-bold">
                <AutoFurigana text={event.description} />
              </span>
            </div>
          </Link>
        )}

        {!countries ? (
          <SpruLoading />
        ) : countries.length === 0 ? (
          <SkyText muted className="text-sm">
            <AutoFurigana text="まだ国が登録されていません。お楽しみに。" />
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

      {lockedCountry && <LockedCountrySheet name={lockedCountry.name} onClose={() => setLockedCountry(null)} />}

      <BottomNav />
    </SkyPage>
  );
}
