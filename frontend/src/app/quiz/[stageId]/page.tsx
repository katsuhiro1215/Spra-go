"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { useProfile } from "@/components/app/profile-provider";
import { SceneBackground } from "@/components/app/scene-background";
import { useSound } from "@/components/app/sound-provider";
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
type ComboInfo = { combo: number; combo_milestone_bonus_coin: number };
type StreakInfo = {
  streak: number;
  streak_extended_today: boolean;
  streak_milestone_bonus_coin: number;
};

type CompleteResult = { title_granted: boolean; title: string | null };
type HpBlocked = { hp: number; max_hp: number; hp_regen_seconds: number | null };

function formatMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 「国名→国旗」形式の選択肢は絵文字の国旗文字(例:🇬🇧)がそのままテキストで
// 入っている。環境によっては極小表示や文字化けになるため、可能なら
// /flag/{code}.svgの実画像に差し替える(選択肢データ自体は変更しない)。
function flagEmojiToCountryCode(text: string): string | null {
  const codePoints = Array.from(text.trim());
  if (codePoints.length !== 2) return null;

  const offsets = codePoints.map((ch) => ch.codePointAt(0));
  if (
    offsets.some(
      (cp) => cp === undefined || cp < 0x1f1e6 || cp > 0x1f1ff,
    )
  ) {
    return null;
  }

  return offsets
    .map((cp) => String.fromCharCode((cp as number) - 0x1f1e6 + 65))
    .join("")
    .toLowerCase();
}

function ChoiceLabel({ label }: { label: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const flagCode = flagEmojiToCountryCode(label);

  if (!flagCode || imageFailed) {
    // ボタンはflexコンテナのため、AutoFurigana(<ruby>を含む複数要素)がそのまま
    // 子として並ぶと各要素が個別のflexアイテムになり、1文字ずつ改行されて
    // しまう。1つのspanで包んで、その中で通常のテキスト折り返しにする。
    return (
      <span>
        <AutoFurigana text={label} />
      </span>
    );
  }

  return (
    // 存在しない国コードでもonErrorで絵文字表示にフォールバックしたいため、next/imageではなく生imgを使う
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flag/${flagCode}.svg`}
      alt={label}
      className="h-9 w-12 rounded-sm border border-border object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = use(params);
  const router = useRouter();
  const { play: playSound, playBgm, stopBgm } = useSound();
  const { profile, applyPartial, refresh: refreshProfile } = useProfile();

  const [stage, setStage] = useState<StagePlayData | null | undefined>(
    undefined,
  );
  const [hpBlocked, setHpBlocked] = useState<HpBlocked | null>(null);
  const [hpBlockedSecondsLeft, setHpBlockedSecondsLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(
    null,
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastDelta, setLastDelta] = useState<EconomyDelta | null>(null);
  const [combo, setCombo] = useState<ComboInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
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
    playBgm("bgm1");
    return () => stopBgm();
  }, [playBgm, stopBgm]);

  // 画面を開いた時点ですでにHPが0なら、問題を見せる前にブロック画面にする
  useEffect(() => {
    (async () => {
      if (profile && profile.hp <= 0) {
        setHpBlocked({
          hp: profile.hp,
          max_hp: profile.max_hp,
          hp_regen_seconds: profile.hp_regen_seconds,
        });
      } else if (profile && profile.hp > 0) {
        setHpBlocked(null);
      }
    })();
  }, [profile]);

  useEffect(() => {
    (async () => {
      if (hpBlocked) {
        setHpBlockedSecondsLeft(hpBlocked.hp_regen_seconds ?? 0);
      }
    })();
  }, [hpBlocked]);

  useEffect(() => {
    if (!hpBlocked) return;

    const timer = setInterval(() => {
      setHpBlockedSecondsLeft((prev) => {
        if (prev <= 1) {
          (async () => {
            await refreshProfile();
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hpBlocked, refreshProfile]);

  useEffect(() => {
    if (!stage || completionSubmitted) return;
    if (currentIndex < stage.questions.length) return;

    if (score === stage.questions.length) {
      playSound("allCorrect");
    }

    (async () => {
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
    })();
  }, [stage, currentIndex, completionSubmitted, stageId, score, playSound]);

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

  if (hpBlocked) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <p className="text-5xl">💤</p>
            <h1 className="text-xl font-bold">これ以上続けられません</h1>
            <p className="text-sm text-muted-foreground">
              ハートがなくなっちゃった。もう少し待とう。
            </p>
            {hpBlockedSecondsLeft > 0 ? (
              <p className="text-3xl font-bold text-primary">
                {formatMinutesSeconds(hpBlockedSecondsLeft)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                確認しています...
              </p>
            )}
            <Link href="/">
              <AppButton variant="default">ホームに戻る</AppButton>
            </Link>
          </div>
        </div>
        <BottomNav />
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

      if (res.status === 409) {
        const data = await res.json();
        setHpBlocked({
          hp: data.profile?.hp ?? 0,
          max_hp: data.profile?.max_hp ?? profile?.max_hp ?? 20,
          hp_regen_seconds: data.profile?.hp_regen_seconds ?? null,
        });
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      setSelectedChoiceId(choiceId);
      setCorrectChoiceId(data.correct_choice_id);
      setAnswered(true);
      setLastCorrect(Boolean(data.correct));
      playSound(data.correct ? "correct" : "incorrect");
      setLastDelta(data.profile?.delta ?? null);
      if (data.profile) {
        applyPartial({
          hp: data.profile.hp,
          max_hp: data.profile.max_hp,
          hp_regen_seconds: data.profile.hp_regen_seconds,
          coins: data.profile.coins,
          xp: data.profile.xp,
          level: data.profile.level,
          current_streak: data.profile.streak,
        });
      }
      setCombo(
        data.profile
          ? {
              combo: data.profile.combo,
              combo_milestone_bonus_coin:
                data.profile.combo_milestone_bonus_coin,
            }
          : null,
      );
      setStreak(
        data.profile
          ? {
              streak: data.profile.streak,
              streak_extended_today: data.profile.streak_extended_today,
              streak_milestone_bonus_coin:
                data.profile.streak_milestone_bonus_coin,
            }
          : null,
      );
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
    setCombo(null);
    setStreak(null);
    setScore(0);
    setCompletionSubmitted(false);
    setCompleteResult(null);
  }

  if (finished) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <SceneBackground />
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur-sm">
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
        </div>
        <BottomNav />
      </div>
    );
  }

  const correctChoiceLabel = question.choices.find(
    (c) => c.id === correctChoiceId,
  )?.label;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-8 rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-sm">
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
            <h1 className="mt-2 text-xl font-bold">
              <AutoFurigana text={question.prompt} />
            </h1>
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
                  className="h-auto min-h-12 w-full items-center justify-center gap-2 py-3 text-center leading-snug whitespace-normal normal-case"
                >
                  {/* 色だけに頼らず、正解/選択した不正解にはアイコンも添える(色弱配慮) */}
                  {variant === "secondary" && <span aria-hidden>✓</span>}
                  {variant === "danger" && <span aria-hidden>✕</span>}
                  <ChoiceLabel label={choice.label} />
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
                  {combo && combo.combo >= 2 && (
                    <p className="animate-stage-intro-subtitle text-lg font-bold text-amber-300">
                      🔥 {combo.combo}コンボ！
                    </p>
                  )}
                  {combo && combo.combo_milestone_bonus_coin > 0 && (
                    <p className="animate-stage-intro-subtitle text-base font-semibold text-amber-200">
                      ボーナス +{combo.combo_milestone_bonus_coin}Coin
                    </p>
                  )}
                  {streak?.streak_extended_today && (
                    <p className="animate-stage-intro-subtitle text-base font-semibold text-orange-200">
                      🔥 {streak.streak}日連続プレイ！
                      {streak.streak_milestone_bonus_coin > 0 &&
                        ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
                    </p>
                  )}
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
                      <span className="flex items-center gap-1 text-base font-normal text-white/80">
                        正解: <ChoiceLabel label={correctChoiceLabel} />
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
      </div>
    </div>
  );
}
