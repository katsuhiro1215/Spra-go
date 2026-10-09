"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { LockedCountry } from "@/components/travel/locked-country";
import { apiFetch } from "@/lib/api";
import { AutoFurigana } from "@/components/app/auto-furigana";

type CountryStart = {
  id: number;
  code: string;
  name: string;
  mood_emoji: string | null;
  intro_message: string | null;
  /** その国の言語のコース(国に結びつかない)。ステージのある言語だけ。なければ null */
  language: { key: string; name: string } | null;
};

export default function Page({
  params,
}: {
  params: Promise<{ countryId: string }>;
}) {
  const { countryId } = use(params);
  const router = useRouter();
  const [country, setCountry] = useState<CountryStart | null | undefined>(
    undefined,
  );

  const [locked, setLocked] = useState(false);

  useEffect(() => {
    apiFetch(`/api/countries/${countryId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          setLocked(true);
          return;
        }
        setCountry(res.ok ? await res.json() : null);
      })
      .catch(() => setCountry(null));
  }, [countryId, router]);

  if (locked) return <LockedCountry />;

  if (country === undefined) {
    return (
      <LoadingScreen />
    );
  }

  if (country === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#8fd4e9] text-[#3b3226]">
        <p className="text-sm">
          <AutoFurigana text="この国は見つかりませんでした。" />
        </p>
        <Link href="/" className="text-sm text-[#2b5d7a] underline">
          <AutoFurigana text="ホームに戻る" />
        </Link>
      </div>
    );
  }



  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-12 pb-24 text-center">
        <div className="animate-stage-intro relative h-28 w-44 overflow-hidden rounded-lg border-4 border-[#fffaf0] shadow-xl">
          <Image
            src={`/flag/${country.code}.svg`}
            alt={country.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="animate-stage-intro-subtitle flex flex-col gap-2">
          <SkyTitle className="text-3xl">
            {country.mood_emoji ? `${country.mood_emoji} ` : ""}
            {country.name}
          </SkyTitle>
          {country.intro_message && (
            <SkyText muted className="text-sm">
              {country.intro_message}
            </SkyText>
          )}
        </div>

        <div className="animate-stage-intro-subtitle flex w-full flex-col gap-3">
          <SkyText muted className="text-sm">
            <AutoFurigana text="ゲームを開始しますか？" />
          </SkyText>
          <AppButton
            variant="primary"
            size="lg"
            className="w-full normal-case"
            onClick={() => router.push(`/travel/${countryId}?mode=trivia`)}
          >
            {country.name}を学ぶ
          </AppButton>
          {country.language && (
            <AppButton
              variant="secondary"
              size="lg"
              className="w-full normal-case"
              onClick={() =>
                router.push(`/travel/${countryId}?mode=language`)
              }
            >
              {country.language.name}を学ぶ
            </AppButton>
          )}
          <Link
            href="/learn"
            className="self-center rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
          >
            <AutoFurigana text="← 別の国を選ぶ" />
          </Link>
        </div>
      </div>

      <BottomNav />
    </SkyPage>
  );
}
