"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { SceneBackground } from "@/components/app/scene-background";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { QuizQuestion } from "@/components/quiz/types";
import { apiFetch } from "@/lib/api";

type StagePlayData = {
  id: number;
  category: { id: number; name: string };
  difficulty: string;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  questions: QuizQuestion[];
};

export default function Page({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = use(params);
  const router = useRouter();
  const { applyPartial } = useProfile();
  const [stage, setStage] = useState<StagePlayData | null | undefined>(
    undefined,
  );

  useEffect(() => {
    apiFetch(`/api/stages/${stageId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setStage(res.ok ? await res.json() : null);
      })
      .catch(() => setStage(null));
  }, [stageId, router]);

  async function completeStage(score: number): Promise<ReactNode> {
    const res = await apiFetch(`/api/stages/${stageId}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // ステージクリアのコイン+100・学習ポイント+50をヘッダーにも反映する
    applyPartial({ coins: data.profile.coins, points: data.profile.points });
    return data.title_granted && data.title ? (
      <p className="text-sm font-semibold text-amber-600">
        🏆 称号「{data.title}」を獲得しました！
      </p>
    ) : null;
  }

  if (stage === undefined) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 items-center justify-center text-sm text-white/85 drop-shadow">
          読み込み中...
        </div>
        <BottomNav />
      </div>
    );
  }

  if (stage === null || stage.questions.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/85 drop-shadow">
            このステージは見つかりませんでした。
          </p>
          <Link href="/" className="text-sm text-white/85 hover:underline">
            ホームに戻る
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <QuizSession
      key={stage.id}
      questions={stage.questions}
      title={
        <>
          {stage.category.name} ・ Stage {stage.stage_number}
          {stage.is_boss && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              BOSS
            </span>
          )}
        </>
      }
      stageNumber={stage.stage_number}
      allowRestart
      backLabel="ホームに戻る"
      onFinish={completeStage}
    />
  );
}
