"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { Button as AppButton } from "@/components/app/button";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

type CountryStart = {
  id: number;
  code: string;
  name: string;
  mood_emoji: string | null;
  intro_message: string | null;
  groups: { category: { name: string; is_language_mode: boolean } }[];
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

  useEffect(() => {
    apiFetch(`/api/countries/${countryId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setCountry(res.ok ? await res.json() : null);
      })
      .catch(() => setCountry(null));
  }, [countryId, router]);

  if (country === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (country === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          この国は見つかりませんでした。
        </p>
        <Link href="/" className="text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const languageGroup = country.groups.find(
    (group) => group.category.is_language_mode,
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="animate-stage-intro relative h-28 w-44 overflow-hidden rounded-lg border border-white/40 shadow-xl">
          <Image
            src={`/flag/${country.code}.svg`}
            alt={country.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="animate-stage-intro-subtitle flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            {country.mood_emoji ? `${country.mood_emoji} ` : ""}
            {country.name}
          </h1>
          {country.intro_message && (
            <p className="text-sm text-white/85 drop-shadow">
              {country.intro_message}
            </p>
          )}
        </div>

        <div className="animate-stage-intro-subtitle flex w-full flex-col gap-3">
          <p className="text-sm font-semibold text-white/90 drop-shadow">
            ゲームを開始しますか？
          </p>
          <AppButton
            variant="primary"
            size="lg"
            className="w-full normal-case"
            onClick={() => router.push(`/travel/${countryId}?mode=trivia`)}
          >
            {country.name}について学ぶ
          </AppButton>
          {languageGroup && (
            <AppButton
              variant="secondary"
              size="lg"
              className="w-full normal-case"
              onClick={() =>
                router.push(`/travel/${countryId}?mode=language`)
              }
            >
              {languageGroup.category.name}
            </AppButton>
          )}
          <Link
            href="/"
            className="text-xs text-white/75 drop-shadow hover:underline"
          >
            ← 別の国を選ぶ
          </Link>
        </div>
      </div>
    </div>
  );
}
