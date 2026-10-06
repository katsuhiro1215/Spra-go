"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { BadgeImage } from "@/components/app/badge-image";
import { SkyPage, SkyText } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { QuizQuestion } from "@/components/quiz/types";
import { LockedCountry } from "@/components/travel/locked-country";
import { TicketEarnedCard } from "@/components/travel/ticket-earned-card";
import { apiFetch } from "@/lib/api";
import { retryMessage } from "@/lib/stage-result";

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

  const [locked, setLocked] = useState(false);
  // 「もういちど」で、ステージを読み直す(ステージの問題は、開くたびに抽選し直す)
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    apiFetch(`/api/stages/${stageId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          setLocked(true);
          return;
        }
        setStage(res.ok ? await res.json() : null);
      })
      .catch(() => setStage(null));
  }, [stageId, router, attempt]);

  async function completeStage(score: number): Promise<ReactNode> {
    const res = await apiFetch(`/api/stages/${stageId}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // ステージクリアのコイン+100・学習ポイント+50をヘッダーにも反映する
    applyPartial({ coins: data.profile.coins, points: data.profile.points });
    // 県の上級のボスを全問正解したときは、県のバッジの絵を大きく見せる(docs/design/2026-10-05-prefecture-quiz-design.md 7-2)
    const titleNote =
      data.title_granted && data.title ? (
        data.title_badge ? (
          <div className="flex flex-col items-center gap-2">
            <Image src={data.title_badge} alt={`${data.title}のバッジ`} width={112} height={112} className="drop-shadow-lg" />
            <p className="text-center text-sm font-black text-[#7a5a0e]">
              <AutoFurigana text={`称号「${data.title}」と バッジを ゲット！`} />
            </p>
          </div>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm font-black text-[#7a5a0e]">
            <BadgeImage badge="crown" size={44} />
            称号「{data.title}」を獲得しました！
          </p>
        )
      ) : null;
    // ボスでチケットがもらえたときは、結果の画面にカードを出す(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4)
    const ticketNote = data.ticket_earned ? <TicketEarnedCard /> : null;
    // クリアに届かなかったときは、あと何問かと、「もういちど」(読み直して、新しく挑戦する)
    const message = data.cleared === false ? retryMessage(data.required, score) : null;
    const retryNote = message ? (
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-sm font-black text-[#3b3226]">
          <AutoFurigana text={message} />
        </p>
        <button
          type="button"
          onClick={() => {
            setStage(undefined);
            setAttempt((n) => n + 1);
          }}
          className="rounded-full bg-[#3b7f26] px-5 py-2 text-sm font-black text-white shadow"
        >
          ステージを やりなおす
        </button>
      </div>
    ) : null;
    return titleNote || ticketNote || retryNote ? (
      <>
        {retryNote}
        {titleNote}
        {ticketNote}
      </>
    ) : null;
  }

  if (locked) return <LockedCountry />;

  if (stage === undefined) {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <SpruLoading />
        </div>
        <BottomNav />
      </SkyPage>
    );
  }

  if (stage === null || stage.questions.length === 0) {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
          <SkyText muted className="text-sm">
            このステージは見つかりませんでした。
          </SkyText>
          <Link href="/" className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white">
            ホームに戻る
          </Link>
        </div>
        <BottomNav />
      </SkyPage>
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
            <span className="flex items-center gap-0.5 rounded-full bg-[#c2402c] py-0.5 pr-2 pl-1 text-[10px] font-bold text-white">
              <BadgeImage badge="boss" size={16} />
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
