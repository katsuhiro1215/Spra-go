"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Trophy } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { BadgeImage } from "@/components/app/badge-image";
import { difficultyBadge } from "@/components/app/palette";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen, SpruLoading } from "@/components/app/spru-loading";
import { StagePath } from "@/components/app/stage-path";
import { apiFetch } from "@/lib/api";
import { DIFFICULTY_READINGS } from "@/lib/difficulty";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Difficulty = "初級" | "中級" | "上級";

type StageSummary = {
  id: number;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  question_count: number;
  assigned_count: number;
  cleared: boolean;
  locked: boolean;
};

type DifficultyGroup = {
  difficulty: Difficulty;
  locked: boolean;
  stages: StageSummary[];
};

const DIFFICULTIES: Difficulty[] = ["初級", "中級", "上級"];

type StageIntro = {
  stageId: number;
  stageNumber: number;
  difficulty: Difficulty;
  isBoss: boolean;
};

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [category, setCategory] = useState<Category | null | undefined>(
    undefined,
  );
  const [groups, setGroups] = useState<DifficultyGroup[] | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageSummary | null>(
    null,
  );
  const [stageIntro, setStageIntro] = useState<StageIntro | null>(null);
  // スプルキャッチの問題の出どころ(「英語を学ぶ」)のカテゴリー。この画面がそれなら、ゲームのボタンを出す
  const [catchCategoryId, setCatchCategoryId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/categories")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const categories: Category[] = await res.json();
        setCategory(categories.find((c) => String(c.id) === id) ?? null);
      })
      .catch(() => router.replace("/login"));

    apiFetch(`/api/categories/${id}/stages`).then(async (res) => {
      if (res.ok) setGroups(await res.json());
    });

    apiFetch("/api/games/catch")
      .then(async (res) => {
        if (res.ok) setCatchCategoryId((await res.json()).category_id);
      })
      .catch(() => {});
  }, [id, router]);

  useEffect(() => {
    if (!stageIntro) return;

    const timer = setTimeout(() => {
      router.push(`/quiz/${stageIntro.stageId}`);
    }, 1800);

    return () => clearTimeout(timer);
  }, [stageIntro, router]);

  if (category === undefined) {
    return (
      <LoadingScreen />
    );
  }

  const groupsByDifficulty = new Map(
    DIFFICULTIES.map((difficulty) => [
      difficulty,
      groups?.find((g) => g.difficulty === difficulty),
    ]),
  );
  const stagesByDifficulty = new Map(
    DIFFICULTIES.map((difficulty) => [
      difficulty,
      groupsByDifficulty.get(difficulty)?.stages ?? [],
    ]),
  );
  const hasAnyStage = (groups ?? []).some((g) =>
    g.stages.some((s) => s.assigned_count > 0),
  );
  const selectedStages = selectedDifficulty
    ? stagesByDifficulty.get(selectedDifficulty)
    : null;

  function handleSelectDifficulty(difficulty: Difficulty) {
    setSelectedDifficulty(difficulty);
    setSelectedStage(null);
  }

  function handleStart() {
    if (!selectedDifficulty || !selectedStage) return;
    setStageIntro({
      stageId: selectedStage.id,
      stageNumber: selectedStage.stage_number,
      difficulty: selectedDifficulty,
      isBoss: selectedStage.is_boss,
    });
  }

  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12 pb-24">
        <div>
          <BackLink />
          <SkyTitle className="mt-2 text-3xl">{category?.name ?? "見つかりません"}</SkyTitle>
        </div>

        {groups === null ? (
          <SpruLoading />
        ) : !hasAnyStage ? (
          <SkyText muted className="text-sm">
            まだクイズがありません。お楽しみに。
          </SkyText>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {DIFFICULTIES.map((difficulty, index) => {
                const stages = stagesByDifficulty.get(difficulty) ?? [];
                const progressionLocked =
                  groupsByDifficulty.get(difficulty)?.locked ?? index > 0;
                const available =
                  stages.some((s) => s.assigned_count > 0) &&
                  !progressionLocked;
                const isSelected = selectedDifficulty === difficulty;
                const allCleared =
                  stages.length > 0 && stages.every((s) => s.cleared);
                const previousDifficulty =
                  index > 0 ? DIFFICULTIES[index - 1] : null;
                const badge = difficultyBadge(difficulty);

                return (
                  <AppButton
                    key={difficulty}
                    variant={
                      isSelected ? "primary" : available ? "default" : "locked"
                    }
                    size="lg"
                    disabled={!available}
                    onClick={() => handleSelectDifficulty(difficulty)}
                    className="flex w-full items-center justify-between px-6"
                  >
                    <span className="flex items-center gap-2">
                      {progressionLocked && <Lock aria-hidden className="h-4 w-4" />}
                      {badge && <BadgeImage badge={badge} size={22} />}
                      <Furigana
                        text={difficulty}
                        reading={DIFFICULTY_READINGS[difficulty] ?? ""}
                      />
                      {allCleared && (
                        <span className="flex items-center gap-1 rounded-full bg-[#f2b632] px-2 py-0.5 text-[10px] font-black text-[#3b3226]">
                          <Trophy aria-hidden className="h-3 w-3" />
                          クリア
                        </span>
                      )}
                    </span>
                    <span className="text-xs opacity-80">
                      {progressionLocked
                        ? previousDifficulty
                          ? `${previousDifficulty}クリアで解放`
                          : "準備中"
                        : stages.some((s) => s.assigned_count > 0)
                          ? `Stage 1〜${stages.length}`
                          : "準備中"}
                    </span>
                  </AppButton>
                );
              })}
            </div>

            {selectedStages && selectedStages.length > 0 && (
              // 次に遊ぶステージの「START」の吹き出しが難易度のボタンに重ならないよう、上をあける
              <div className="pt-6">
                <StagePath
                  stages={selectedStages}
                  selectedId={selectedStage?.id ?? null}
                  onSelect={(stage) =>
                    setSelectedStage(
                      selectedStages.find((s) => s.id === stage.id) ?? null,
                    )
                  }
                />
              </div>
            )}

            <AppButton
              variant="secondary"
              size="lg"
              disabled={!selectedStage}
              onClick={handleStart}
              className="w-full"
            >
              スタート
            </AppButton>

            {catchCategoryId !== null && category?.id === catchCategoryId && (
              <Link href="/games/catch">
                <AppButton variant="warning" size="lg" className="w-full">
                  スプルキャッチで遊ぶ
                </AppButton>
              </Link>
            )}
          </>
        )}
      </div>

      {stageIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(143,212,233,0.7)] px-4">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] px-8 py-6 text-center shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
            {stageIntro.isBoss ? (
              <>
                <BadgeImage badge="boss-battle" size={96} className="animate-stage-intro" />
                <p className="animate-stage-intro text-4xl font-black text-[#b4472c]">BOSS STAGE</p>
              </>
            ) : (
              <p className="animate-stage-intro text-5xl font-black text-[#2b6fa3]">STAGE {stageIntro.stageNumber}</p>
            )}
            <p className="animate-stage-intro-subtitle text-base font-bold text-[#6b5d45]">
              {category?.name} ・ {stageIntro.difficulty}
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </SkyPage>
  );
}
