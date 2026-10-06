"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Trophy } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { Furigana } from "@/components/app/furigana";
import { Panel } from "@/components/app/panel";
import { SkyPage, SkyText } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { StageMap } from "@/components/app/stage-map";
import { BadgeImage } from "@/components/app/badge-image";
import { difficultyBadge } from "@/components/app/palette";
import { LockedCountry } from "@/components/travel/locked-country";
import { apiFetch } from "@/lib/api";
import { roadArt } from "@/components/travel/road";
import { groupsLevel, levelRatio, levelText } from "@/lib/course-levels";
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

const DIFFICULTY_ORDER = ["初級", "中級", "上級"];

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
  /** その国の言語のコース(国に結びつかない)。ステージのある言語だけ。なければ null */
  language: { key: string; name: string } | null;
  language_groups: StageGroup[];
};

function regionPercent(region: RegionSummary): number {
  return region.achievement.total > 0
    ? Math.round((region.achievement.cleared / region.achievement.total) * 100)
    : 0;
}

// タブの初期選択: 遊べる中で一番易しい未クリアの難易度を優先し、
// 無ければ最初のグループにフォールバックする
function pickDefaultDifficulty(groups: StageGroup[]): string | null {
  const playable = groups.find(
    (g) => !g.locked && !g.stages.every((s) => s.cleared),
  );
  return (playable ?? groups[0])?.difficulty ?? null;
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null,
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
          この国は見つかりませんでした。
        </p>
        <Link href="/" className="text-sm text-[#2b5d7a] underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  // コースの道は、国のメインの道(groups)か、言語のコース(language_groups)。レベルはクリアしたステージの数
  const courseGroups = mode === "language" ? country.language_groups : country.groups;
  const { level, max } = groupsLevel(courseGroups);
  const filteredGroups = DIFFICULTY_ORDER.flatMap((difficulty) => {
    const group = courseGroups.find((g) => g.difficulty === difficulty);
    return group ? [group] : [];
  });
  const activeDifficulty =
    selectedDifficulty ?? pickDefaultDifficulty(filteredGroups);
  const activeGroup = filteredGroups.find(
    (g) => g.difficulty === activeDifficulty,
  );

  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12 pb-24">
        <div>
          <BackLink />

          <Panel className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[#e8dfcf] shadow">
                <Image src={`/flag/${country.code}.svg`} alt={country.name} fill className="object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-black">
                  {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                  {country.name}
                </h1>
                {country.intro_message && <p className="mt-1 text-sm font-bold text-[#6b5d45]">{country.intro_message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-[#efe5cf]">
                <div className="h-full rounded-full bg-[#5bb33e]" style={{ width: `${Math.round(levelRatio(level, max) * 100)}%` }} />
              </div>
              <span className="text-xs font-bold whitespace-nowrap text-[#6b5d45]">
                {mode === "language" ? `${country.language?.name ?? ""}レベル` : `${country.name}レベル`} {levelText(level, max)}
              </span>
            </div>
          </Panel>
        </div>

        {country.language && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("trivia");
                setSelectedDifficulty(null);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
                mode === "trivia"
                  ? "bg-[#3b7f26] text-white"
                  : "bg-[#fffaf0] text-[#3b3226] hover:bg-white"
              }`}
            >
              {country.name}を学ぶ
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("language");
                setSelectedDifficulty(null);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow ${
                mode === "language"
                  ? "bg-[#3b7f26] text-white"
                  : "bg-[#fffaf0] text-[#3b3226] hover:bg-white"
              }`}
            >
              {country.language.name}を学ぶ
            </button>
          </div>
        )}

        {country.regions.length === 0 && courseGroups.length === 0 ? (
          <SkyText muted className="text-sm">
            まだこの国のクイズがありません。お楽しみに。
          </SkyText>
        ) : (
          <div className="flex flex-col gap-8">
            {country.regions.length > 0 && mode === "trivia" && (
              <div className="flex flex-col gap-3">
                <h2>
                  <SkyText as="span" className="text-sm">
                    地域を選ぶ
                  </SkyText>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {country.regions.map((region) => (
                    <Link
                      key={region.id}
                      href={`/travel/${countryId}/region/${region.id}`}
                    >
                      <div className="flex flex-col gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white p-4 text-[#3b3226] hover:bg-[#fffaf0]">
                        <p className="text-sm font-black text-[#3b3226]">
                          {region.name}
                        </p>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#efe5cf]">
                          <div
                            className="h-full rounded-full bg-[#5bb33e]"
                            style={{ width: `${regionPercent(region)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#6b5d45]">
                          達成率 {regionPercent(region)}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filteredGroups.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  {filteredGroups.map((group) => {
                    const isSelected = group.difficulty === activeDifficulty;
                    const allCleared =
                      group.stages.length > 0 &&
                      group.stages.every((s) => s.cleared);
                    const badge = difficultyBadge(group.difficulty);

                    return (
                      <button
                        key={group.difficulty}
                        type="button"
                        onClick={() => setSelectedDifficulty(group.difficulty)}
                        disabled={group.locked}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow disabled:cursor-not-allowed ${
                          isSelected
                            ? "bg-[#3b7f26] text-white"
                            : group.locked
                              ? "bg-[#efe5cf] text-[#8a7a5a]"
                              : "bg-[#fffaf0] text-[#3b3226] hover:bg-white"
                        }`}
                      >
                        {group.locked && <Lock aria-hidden className="h-3.5 w-3.5" />}
                        {badge && <BadgeImage badge={badge} size={20} />}
                        <Furigana
                          text={group.difficulty}
                          reading={DIFFICULTY_READINGS[group.difficulty] ?? ""}
                        />
                        {allCleared && <Trophy aria-hidden className="h-3.5 w-3.5 text-[#c98f12]" />}
                      </button>
                    );
                  })}
                </div>

                {activeGroup?.locked ? (
                  <SkyText muted className="text-xs">
                    ひとつ前の難易度のボスをクリアするか、正答率が50%をこえると挑戦できます。
                  </SkyText>
                ) : (
                  activeGroup && (
                    // 次に遊ぶステージの「START」の吹き出しがタブに重ならないよう、上をあける
                    <div className="pt-6">
                      <StageMap
                        stages={activeGroup.stages}
                        roadArt={roadArt(country.code.toLowerCase())?.art ?? null}
                        walkKey={`${countryId}:${mode}:${activeGroup.difficulty}`}
                        onSelect={(stage) => router.push(`/quiz/${stage.id}`)}
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </SkyPage>
  );
}
