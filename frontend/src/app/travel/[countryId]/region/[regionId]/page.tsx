"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { Button as AppButton } from "@/components/app/button";
import { BadgeImage } from "@/components/app/badge-image";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { LockedCountry } from "@/components/travel/locked-country";
import { apiFetch } from "@/lib/api";

type StageSummary = {
  id: number;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  cleared: boolean;
  locked: boolean;
};

type StageGroup = {
  category: { id: number; name: string };
  difficulty: string;
  stages: StageSummary[];
};

type RegionSummary = {
  id: number;
  name: string;
  achievement: { cleared: number; total: number };
};

type RegionDetail = {
  id: number;
  name: string;
  country: { id: number; code: string; name: string };
  ancestors: { id: number; name: string }[];
  achievement: { cleared: number; total: number };
  children: RegionSummary[];
  groups: StageGroup[];
};

function percentOf(achievement: { cleared: number; total: number }): number {
  return achievement.total > 0
    ? Math.round((achievement.cleared / achievement.total) * 100)
    : 0;
}

export default function Page({
  params,
}: {
  params: Promise<{ countryId: string; regionId: string }>;
}) {
  const { countryId, regionId } = use(params);
  const router = useRouter();
  const [region, setRegion] = useState<RegionDetail | null | undefined>(
    undefined,
  );

  const [locked, setLocked] = useState(false);

  useEffect(() => {
    apiFetch(`/api/regions/${regionId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          setLocked(true);
          return;
        }
        setRegion(res.ok ? await res.json() : null);
      })
      .catch(() => setRegion(null));
  }, [regionId, router]);

  if (locked) return <LockedCountry />;

  if (region === undefined) {
    return (
      <LoadingScreen />
    );
  }

  if (region === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#8fd4e9] text-[#3b3226]">
        <p className="text-sm">
          この地域は見つかりませんでした。
        </p>
        <Link href="/" className="text-sm text-[#2b5d7a] underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const percent = percentOf(region.achievement);

  return (
    <SkyPage>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <div>
          <SkyText muted as="div" className="flex flex-wrap items-center gap-1 text-sm">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span>/</span>
            <Link href={`/travel/${countryId}`} className="hover:underline">
              {region.country.name}
            </Link>
            {region.ancestors.map((ancestor) => (
              <span key={ancestor.id} className="flex items-center gap-1">
                <span>/</span>
                <Link
                  href={`/travel/${countryId}/region/${ancestor.id}`}
                  className="hover:underline"
                >
                  {ancestor.name}
                </Link>
              </span>
            ))}
          </SkyText>

          <SkyTitle className="mt-2 text-3xl">{region.name}</SkyTitle>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-[#efe5cf]">
              <div
                className="h-full rounded-full bg-[#5bb33e]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <SkyText muted as="span" className="text-xs whitespace-nowrap">
              達成率 {percent}%({region.achievement.cleared}/
              {region.achievement.total})
            </SkyText>
          </div>
        </div>

        {region.children.length === 0 && region.groups.length === 0 ? (
          <SkyText muted className="text-sm">
            まだこの地域のクイズがありません。お楽しみに。
          </SkyText>
        ) : region.children.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {region.children.map((child) => (
              <Link
                key={child.id}
                href={`/travel/${countryId}/region/${child.id}`}
              >
                <div className="flex flex-col gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white p-4 text-[#3b3226] hover:bg-[#fffaf0]">
                  <p className="text-sm font-black text-[#3b3226]">
                    {child.name}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#efe5cf]">
                    <div
                      className="h-full rounded-full bg-[#5bb33e]"
                      style={{ width: `${percentOf(child.achievement)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#6b5d45]">
                    達成率 {percentOf(child.achievement)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {region.groups.map((group) => (
              <div
                key={`${group.category.id}-${group.difficulty}`}
                className="flex flex-col gap-3"
              >
                <h2>
                  <SkyText as="span" className="text-sm">
                    {group.category.name} ・ {group.difficulty}
                  </SkyText>
                </h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {group.stages.map((stage) => {
                    const playable = !stage.locked;

                    return (
                      <AppButton
                        key={stage.id}
                        variant={
                          !playable
                            ? "locked"
                            : stage.is_boss
                              ? "danger"
                              : stage.cleared
                                ? "secondary"
                                : "default"
                        }
                        size="lg"
                        disabled={!playable}
                        onClick={() => router.push(`/quiz/${stage.id}`)}
                        aria-label={stage.locked ? `ステージ${stage.stage_number}(ロック中)` : undefined}
                        className="relative flex flex-col items-center gap-0.5 px-2"
                      >
                        {stage.cleared && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3b7f26] text-[10px] text-white">
                            ✓
                          </span>
                        )}
                        <span>{stage.locked ? <Lock aria-hidden className="h-4 w-4" /> : stage.stage_number}</span>
                        {stage.is_boss && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold opacity-90">
                            <BadgeImage badge="boss" size={16} />
                            BOSS
                          </span>
                        )}
                      </AppButton>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SkyPage>
  );
}
