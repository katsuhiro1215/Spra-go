"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { apiFetch } from "@/lib/api";

type Choice = { id: number; label: string };
type Country = { id: number; code: string; name: string };
type QuestionItem = {
  id: number;
  prompt: string;
  country: Country | null;
  choices: Choice[];
};
type StagePlayData = {
  id: number;
  category: { id: number; name: string };
  difficulty: string;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  questions: QuestionItem[];
};

type EconomyDelta = { hp?: number; xp?: number; coin?: number };

type CompleteResult = { title_granted: boolean; title: string | null };

export default function Page({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = use(params);
  const router = useRouter();

  const [stage, setStage] = useState<StagePlayData | null | undefined>(
    undefined,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(
    null,
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastDelta, setLastDelta] = useState<EconomyDelta | null>(null);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionSubmitted, setCompletionSubmitted] = useState(false);
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(
    null,
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

  useEffect(() => {
    if (!stage || completionSubmitted) return;
    if (currentIndex < stage.questions.length) return;

    setCompletionSubmitted(true);
    apiFetch(`/api/stages/${stageId}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setCompleteResult({
          title_granted: Boolean(data.title_granted),
          title: data.title ?? null,
        });
      })
      .catch(() => {});
  }, [stage, currentIndex, completionSubmitted, stageId, score]);

  if (stage === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (stage === null || stage.questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          このステージは見つかりませんでした。
        </p>
        <Link href="/" className="text-sm hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const question = stage.questions[currentIndex];
  const isLastQuestion = currentIndex === stage.questions.length - 1;
  const finished = currentIndex >= stage.questions.length;

  async function handleSelect(choiceId: number) {
    if (answered || submitting) return;
    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/questions/${question.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ choice_id: choiceId }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setSelectedChoiceId(choiceId);
      setCorrectChoiceId(data.correct_choice_id);
      setAnswered(true);
      setLastCorrect(Boolean(data.correct));
      setLastDelta(data.profile?.delta ?? null);
      if (data.correct) setScore((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setAnswered(false);
    setLastDelta(null);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setAnswered(false);
    setLastDelta(null);
    setScore(0);
    setCompletionSubmitted(false);
    setCompleteResult(null);
  }

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-2xl font-bold">結果発表</h1>
        <p className="text-4xl font-bold text-primary">
          {score} / {stage.questions.length} 問正解
        </p>
        {completeResult?.title_granted && completeResult.title && (
          <p className="text-sm font-semibold text-amber-600">
            🏆 称号「{completeResult.title}」を獲得しました！
          </p>
        )}
        <div className="flex gap-3">
          <AppButton variant="primary" onClick={handleRestart}>
            もう一度
          </AppButton>
          <Link href="/">
            <AppButton variant="default">ホームに戻る</AppButton>
          </Link>
        </div>
      </div>
    );
  }

  const correctChoiceLabel = question.choices.find(
    (c) => c.id === correctChoiceId,
  )?.label;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-6 py-12">
      <div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {stage.category.name} ・ Stage {stage.stage_number}
          {stage.is_boss && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              BOSS
            </span>
          )}
          <span>
            ・ 問題 {currentIndex + 1} / {stage.questions.length}
          </span>
        </p>
        {question.country && (
          <div className="relative mx-auto mt-4 h-28 w-44 overflow-hidden rounded-lg border border-border shadow-sm">
            <Image
              src={`/flag/${question.country.code}.svg`}
              alt={question.country.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <h1 className="mt-2 text-xl font-bold">{question.prompt}</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.choices.map((choice) => {
          let variant: "default" | "secondary" | "danger" | "locked" =
            "default";
          if (answered) {
            if (choice.id === correctChoiceId) variant = "secondary";
            else if (choice.id === selectedChoiceId) variant = "danger";
            else variant = "locked";
          }

          return (
            <AppButton
              key={choice.id}
              variant={variant}
              size="lg"
              disabled={answered || submitting}
              onClick={() => handleSelect(choice.id)}
              className="w-full normal-case"
            >
              {choice.label}
            </AppButton>
          );
        })}
      </div>

      {answered && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6 text-center ${
            lastCorrect
              ? "bg-linear-to-br from-emerald-950 via-green-900 to-emerald-950"
              : "bg-linear-to-br from-zinc-950 via-rose-950 to-zinc-950"
          }`}
        >
          {lastCorrect ? (
            <>
              <p className="animate-stage-intro text-6xl font-extrabold text-white drop-shadow-lg">
                ✨ Correct!!
              </p>
              <p className="animate-stage-intro-subtitle flex gap-4 text-lg font-semibold text-white/90">
                {typeof lastDelta?.xp === "number" && (
                  <span>+{lastDelta.xp}XP</span>
                )}
                {typeof lastDelta?.coin === "number" && (
                  <span>+{lastDelta.coin}Coin</span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="animate-stage-intro text-5xl font-extrabold text-rose-200 drop-shadow-lg">
                😢 Wrong...
              </p>
              <p className="animate-stage-intro-subtitle flex flex-col items-center gap-1 text-lg font-semibold text-white/90">
                {typeof lastDelta?.hp === "number" && (
                  <span>❤️{lastDelta.hp}</span>
                )}
                {correctChoiceLabel && (
                  <span className="text-base font-normal text-white/80">
                    正解: {correctChoiceLabel}
                  </span>
                )}
              </p>
            </>
          )}

          <AppButton
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="mt-4"
          >
            {isLastQuestion ? "結果を見る ▶" : "次へ ▶"}
          </AppButton>
        </div>
      )}
    </div>
  );
}
