"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyText } from "@/components/app/sky-page";
import { QuizSession } from "@/components/quiz/quiz-session";
import type { QuizQuestion } from "@/components/quiz/types";
import { SpruFigure } from "@/components/spru/spru-figure";
import { heartsText } from "@/components/world/companions";
import type { AnswerPartner, WorldReview } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

type ReviewData = { giver: WorldReview["giver"]; questions: QuizQuestion[] };
type LoadState = { kind: "ready"; data: ReviewData } | { kind: "closed"; message: string };

/** 仲間からの復習(1日1回・最大5問。設計書5-5) */
export default function ReviewPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState | undefined>(undefined);

  useEffect(() => {
    apiFetch("/api/review")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        setState(res.ok ? { kind: "ready", data } : { kind: "closed", message: data.message ?? "復習する問題はないよ" });
      })
      .catch(() => setState({ kind: "closed", message: "通信エラーが発生しました。" }));
  }, [router]);

  async function completeReview(): Promise<ReactNode> {
    const res = await apiFetch("/api/review/complete", { method: "POST" });
    if (!res.ok) return null;
    const data: { bond_gained: number; partner: AnswerPartner | null } = await res.json();
    if (!data.partner || data.bond_gained === 0) return null;
    return (
      <div className="flex flex-col items-center gap-1 text-sm font-bold text-[#2e6b1c]">
        <p>
          <AutoFurigana text={`${data.partner.name}のなかよし度 +${data.bond_gained}`} />
        </p>
        {data.partner.hearts_up && (
          <>
            <p className="text-pink-600">
              <AutoFurigana text={`${data.partner.name}とのなかよし度が上がった！`} />{" "}
              <span aria-label={`ハート${data.partner.hearts}つ`}>{heartsText(data.partner.hearts)}</span>
            </p>
            {data.partner.new_line && (
              <p className="text-muted-foreground">
                <AutoFurigana text={`「${data.partner.new_line}」`} />
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  if (state === undefined) {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <SkyText muted className="text-sm">
            読み込み中...
          </SkyText>
        </div>
        <BottomNav />
      </SkyPage>
    );
  }

  if (state.kind === "closed") {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-8 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
            <SpruFigure image="smile" standHeight={96} />
            <p className="text-base font-bold">
              <AutoFurigana text={state.message} />
            </p>
            <Link href="/">
              <AppButton variant="default">町にもどる</AppButton>
            </Link>
          </div>
        </div>
        <BottomNav />
      </SkyPage>
    );
  }

  return (
    <QuizSession
      questions={state.data.questions}
      title={<AutoFurigana text={`${state.data.giver.name}からの復習`} />}
      allowRestart={false}
      backLabel="町にもどる"
      onFinish={completeReview}
    />
  );
}
