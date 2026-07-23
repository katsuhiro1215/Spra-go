"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

type Difficulty = "初級" | "中級" | "上級";

type StageSummary = {
  difficulty: Difficulty;
  stage_number: number;
  target_count: number;
  available_count: number;
};

const DIFFICULTIES: Difficulty[] = ["初級", "中級", "上級"];

type StageIntro = {
  stage: number;
  difficulty: Difficulty;
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
  const [stages, setStages] = useState<StageSummary[] | null>(null);
  const [selected, setSelected] = useState<Difficulty | null>(null);
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
      if (res.ok) setStages(await res.json());
    });
  }, [id, router]);

  useEffect(() => {
    if (!stageIntro) return;

    const timer = setTimeout(() => {
      router.push(`/quiz/${id}/${encodeURIComponent(stageIntro.difficulty)}`);
    }, 1800);

    return () => clearTimeout(timer);
  }, [stageIntro, id, router]);

  if (category === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  const stageByDifficulty = new Map(
    DIFFICULTIES.map((difficulty) => [
      difficulty,
      stages?.find((s) => s.difficulty === difficulty) ?? null,
    ]),
  );
  const hasAnyStage = (stages ?? []).some((s) => s.available_count > 0);
  const selectedStage = selected ? stageByDifficulty.get(selected) : null;

  function handleStart() {
    if (!selected || !selectedStage) return;
    setStageIntro({
      stage: selectedStage.stage_number,
      difficulty: selected,
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />

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

        {stages === null ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : !hasAnyStage ? (
          <p className="text-sm text-white/85">
            まだクイズがありません。お楽しみに。
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {DIFFICULTIES.map((difficulty) => {
                const stage = stageByDifficulty.get(difficulty);
                const available = Boolean(stage && stage.available_count > 0);
                const isSelected = selected === difficulty;

                return (
                  <AppButton
                    key={difficulty}
                    variant={
                      isSelected ? "primary" : available ? "default" : "locked"
                    }
                    size="lg"
                    disabled={!available}
                    onClick={() => setSelected(difficulty)}
                    className="flex w-full items-center justify-between px-6"
                  >
                    <span>{difficulty}</span>
                    <span className="text-xs opacity-80">
                      {stage
                        ? `${stage.available_count}/${stage.target_count}問`
                        : "準備中"}
                    </span>
                  </AppButton>
                );
              })}
            </div>

            <AppButton
              variant="secondary"
              size="lg"
              disabled={!selected}
              onClick={handleStart}
              className="w-full"
            >
              スタート
            </AppButton>
          </>
        )}
      </div>

      {stageIntro && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-indigo-950 via-purple-900 to-indigo-950">
          <p className="animate-stage-intro text-6xl font-extrabold text-white drop-shadow-lg">
            STAGE {stageIntro.stage}
          </p>
          <p className="animate-stage-intro-subtitle text-lg text-white/80">
            {category?.name} ・ {stageIntro.difficulty}
          </p>
        </div>
      )}
    </div>
  );
}
