"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { BackLink } from "@/components/app/back-link";
import { Furigana } from "@/components/app/furigana";
import { SceneBackground } from "@/components/app/scene-background";
import { StagePath } from "@/components/app/stage-path";
import { apiFetch } from "@/lib/api";
import { DIFFICULTY_READINGS } from "@/lib/difficulty";

type StageSummary = {
  id: number;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  cleared: boolean;
  locked: boolean;
};

type StageGroup = {
  category: { id: number; name: string; is_language_mode: boolean };
  difficulty: string;
  locked: boolean;
  stages: StageSummary[];
};

type RegionSummary = {
  id: number;
  name: string;
  achievement: { cleared: number; total: number };
};

type CountryDetail = {
  id: number;
  code: string;
  name: string;
  mood_emoji: string | null;
  intro_message: string | null;
  achievement: { cleared: number; total: number };
  regions: RegionSummary[];
  groups: StageGroup[];
};

function regionPercent(region: RegionSummary): number {
  return region.achievement.total > 0
    ? Math.round((region.achievement.cleared / region.achievement.total) * 100)
    : 0;
}

export default function Page({
  params,
}: {
  params: Promise<{ countryId: string }>;
}) {
  const { countryId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [country, setCountry] = useState<CountryDetail | null | undefined>(
    undefined,
  );
  const [mode, setMode] = useState<"trivia" | "language">(
    searchParams.get("mode") === "language" ? "language" : "trivia",
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

  const percent =
    country.achievement.total > 0
      ? Math.round(
          (country.achievement.cleared / country.achievement.total) * 100,
        )
      : 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <div>
          <BackLink />

          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-white/40 shadow-lg">
              <Image
                src={`/flag/${country.code}.svg`}
                alt={country.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                {country.name}
              </h1>
              {country.intro_message && (
                <p className="mt-1 text-sm text-white/85 drop-shadow">
                  {country.intro_message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-medium whitespace-nowrap text-white/85 drop-shadow">
              達成率 {percent}%({country.achievement.cleared}/
              {country.achievement.total})
            </span>
          </div>
        </div>

        {country.groups.some((g) => g.category.is_language_mode) && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("trivia")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
                mode === "trivia"
                  ? "bg-amber-400 text-amber-950"
                  : "bg-black/25 text-white/80 hover:bg-black/35"
              }`}
            >
              {country.name}について学ぶ
            </button>
            <button
              type="button"
              onClick={() => setMode("language")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
                mode === "language"
                  ? "bg-amber-400 text-amber-950"
                  : "bg-black/25 text-white/80 hover:bg-black/35"
              }`}
            >
              {country.groups.find((g) => g.category.is_language_mode)
                ?.category.name ?? "言語を学ぶ"}
            </button>
          </div>
        )}

        {country.regions.length === 0 && country.groups.length === 0 ? (
          <p className="text-sm text-white/85">
            まだこの国のクイズがありません。お楽しみに。
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {country.regions.length > 0 && mode === "trivia" && (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-white/90 drop-shadow">
                  地域を選ぶ
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {country.regions.map((region) => (
                    <Link
                      key={region.id}
                      href={`/travel/${countryId}/region/${region.id}`}
                    >
                      <div className="flex flex-col gap-2 rounded-lg border border-white/30 bg-black/20 p-4 shadow-lg backdrop-blur-sm hover:bg-black/30">
                        <p className="text-sm font-medium text-white">
                          {region.name}
                        </p>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-300"
                            style={{ width: `${regionPercent(region)}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/80">
                          達成率 {regionPercent(region)}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {country.groups
              .filter((group) =>
                mode === "language"
                  ? group.category.is_language_mode
                  : !group.category.is_language_mode,
              )
              .map((group) => (
                <div
                  key={`${group.category.id}-${group.difficulty}`}
                  className="flex flex-col gap-3"
                >
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white/90 drop-shadow">
                    {group.locked && "🔒"}
                    {group.category.name} ・{" "}
                    <Furigana
                      text={group.difficulty}
                      reading={DIFFICULTY_READINGS[group.difficulty] ?? ""}
                    />
                  </h2>
                  {group.locked ? (
                    <p className="text-xs text-white/70">
                      ひとつ前の難易度をクリアすると挑戦できます。
                    </p>
                  ) : (
                    <StagePath
                      stages={group.stages}
                      onSelect={(stage) => router.push(`/quiz/${stage.id}`)}
                    />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
