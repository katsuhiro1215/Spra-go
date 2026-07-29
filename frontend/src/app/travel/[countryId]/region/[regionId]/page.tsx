"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { SceneBackground } from "@/components/app/scene-background";
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

  useEffect(() => {
    apiFetch(`/api/regions/${regionId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setRegion(res.ok ? await res.json() : null);
      })
      .catch(() => setRegion(null));
  }, [regionId, router]);

  if (region === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (region === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          この地域は見つかりませんでした。
        </p>
        <Link href="/" className="text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const percent = percentOf(region.achievement);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <div>
          <p className="flex flex-wrap items-center gap-1 text-sm text-white/80 drop-shadow">
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
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            {region.name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-medium whitespace-nowrap text-white/85 drop-shadow">
              達成率 {percent}%({region.achievement.cleared}/
              {region.achievement.total})
            </span>
          </div>
        </div>

        {region.children.length === 0 && region.groups.length === 0 ? (
          <p className="text-sm text-white/85">
            まだこの地域のクイズがありません。お楽しみに。
          </p>
        ) : region.children.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {region.children.map((child) => (
              <Link
                key={child.id}
                href={`/travel/${countryId}/region/${child.id}`}
              >
                <div className="flex flex-col gap-2 rounded-lg border border-white/30 bg-black/20 p-4 shadow-lg backdrop-blur-sm hover:bg-black/30">
                  <p className="text-sm font-medium text-white">
                    {child.name}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-300"
                      style={{ width: `${percentOf(child.achievement)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80">
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
                <h2 className="text-sm font-semibold text-white/90 drop-shadow">
                  {group.category.name} ・ {group.difficulty}
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
                        className="relative flex flex-col items-center gap-0.5 px-2"
                      >
                        {stage.cleared && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                            ✓
                          </span>
                        )}
                        <span>{stage.locked ? "🔒" : stage.stage_number}</span>
                        {stage.is_boss && (
                          <span className="text-[10px] font-bold opacity-90">
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
    </div>
  );
}
