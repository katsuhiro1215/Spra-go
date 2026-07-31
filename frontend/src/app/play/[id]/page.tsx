"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SceneBackground } from "@/components/app/scene-background";
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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
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
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12">
        <div>
          <Link
            href="/"
            className="text-sm text-white/80 drop-shadow hover:underline"
          >
            ← ホームに戻る
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            {category?.name ?? "見つかりません"}
          </h1>
        </div>

        {groups === null ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : !hasAnyStage ? (
          <p className="text-sm text-white/85">
            まだクイズがありません。お楽しみに。
          </p>
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
                      {progressionLocked && "🔒"}
                      <Furigana
                        text={difficulty}
                        reading={DIFFICULTY_READINGS[difficulty] ?? ""}
                      />
                      {allCleared && (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                          🏆 クリア
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
              <StagePath
                stages={selectedStages}
                selectedId={selectedStage?.id ?? null}
                onSelect={(stage) =>
                  setSelectedStage(
                    selectedStages.find((s) => s.id === stage.id) ?? null,
                  )
                }
              />
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
          </>
        )}
      </div>

      {stageIntro && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 ${
            stageIntro.isBoss
              ? "bg-linear-to-br from-rose-950 via-red-900 to-rose-950"
              : "bg-linear-to-br from-indigo-950 via-purple-900 to-indigo-950"
          }`}
        >
          {stageIntro.isBoss ? (
            <p className="animate-stage-intro text-5xl font-extrabold text-amber-300 drop-shadow-lg">
              ⚔ BOSS STAGE ⚔
            </p>
          ) : (
            <p className="animate-stage-intro text-6xl font-extrabold text-white drop-shadow-lg">
              STAGE {stageIntro.stageNumber}
            </p>
          )}
          <p className="animate-stage-intro-subtitle text-lg text-white/80">
            {category?.name} ・ {stageIntro.difficulty}
          </p>
        </div>
      )}
    </div>
  );
}
