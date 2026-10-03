"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BadgeImage } from "@/components/app/badge-image";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { MatchingQuestion, type MatchingResult } from "@/components/app/matching-question";
import { OrderingQuestion } from "@/components/app/ordering-question";
import { answerHeadline, choiceTone } from "@/components/app/palette";
import { useProfile } from "@/components/app/profile-provider";
import { SkyPage } from "@/components/app/sky-page";
import { SortingQuestion } from "@/components/app/sorting-question";
import { ReportQuestion } from "@/components/quiz/report-question";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf, type Bloom } from "@/components/spru/bloom";
import { CompanionImage } from "@/components/spru/companion-image";
import { pickAnswerImage, pickResult } from "@/components/spru/mood";
import { SpruFigure } from "@/components/spru/spru-figure";
import { heartsText } from "@/components/world/companions";
import { levelUpGrowthLine } from "@/components/world/garden";
import type { AnswerPartner, ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

import { GameHeader } from "./game-header";
import { LevelUpOverlay } from "./level-up-overlay";
import { retryRound } from "./retry";
import { countsTowardScore } from "./score";
import { StageStartCard } from "./stage-start-card";
import { streakLineBonusCoin } from "./streak-milestone";
import { StreakMilestoneOverlay } from "./streak-milestone-overlay";
import type { QuizQuestion } from "./types";

type EconomyDelta = { hp?: number; xp?: number; coin?: number; point?: number };
type ComboInfo = { combo: number; combo_milestone_bonus_coin: number };
type StreakInfo = {
  streak: number;
  streak_extended_today: boolean;
  streak_milestone_bonus_coin: number;
};
type StreakMilestone = { days: number; first: boolean; bonusCoin: number };
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
      className="h-9 w-12 rounded-sm border border-[#e8dfcf] object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

/**
 * 問題を出して答えを送り、正解・不正解・レベルアップ・結果を見せる(ステージと仲間の復習で共通。設計書5-4)。
 * 結果の画面から、まちがえた問題だけをもう一度解ける(練習なので何も記録しない。設計書3-7)
 * ステージに足したおさらいの問題には札を付け、onFinish に渡す点数には入れない(設計書 2026-09-29-spaced-review 5-1)
 */
export function QuizSession({
  questions,
  title,
  stageNumber = null,
  allowRestart,
  backLabel,
  onFinish,
}: {
  questions: QuizQuestion[];
  // 問題番号の前に出す見出し(ステージ名や「〇〇からの復習」)
  title: ReactNode;
  // ステージ開始のカードに出す番号。復習では出さない
  stageNumber?: number | null;
  // 結果の画面の「もう一度」(全部やり直し)。復習では、正解した問題でごほうびが2回もらえてしまうため出さない
  allowRestart: boolean;
  backLabel: string;
  // 最後まで答えたときに1回呼ぶ(やり直しの周では呼ばない)。返したものを結果の画面に足す
  onFinish: (score: number) => Promise<ReactNode>;
}) {
  const { play: playSound, playBgm, stopBgm } = useSound();
  const { profile, applyPartial, refresh: refreshProfile } = useProfile();

  const [round, setRound] = useState(questions);
  // retry は解いた直後のやり直し(練習なので何も記録しない)
  const [mode, setMode] = useState<"main" | "retry">("main");
  const [missedIds, setMissedIds] = useState<number[]>([]);
  const [hpBlocked, setHpBlocked] = useState<HpBlocked | null>(null);
  const [hpBlockedSecondsLeft, setHpBlockedSecondsLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(
    null,
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<number | null>(null);
  const [matchingResults, setMatchingResults] = useState<
    MatchingResult[] | null
  >(null);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastDelta, setLastDelta] = useState<EconomyDelta | null>(null);
  const [combo, setCombo] = useState<ComboInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [score, setScore] = useState(0);
  // ステージの点数(おさらいの問題を除いた正解数)。最後に onFinish に渡す
  const [stageScore, setStageScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionSubmitted, setCompletionSubmitted] = useState(false);
  const [finishNote, setFinishNote] = useState<ReactNode>(null);
  const [levelUp, setLevelUp] = useState<{
    level: number;
    previousLevel: number;
    growthLine: string | null;
    bloom: Bloom | null;
  } | null>(null);
  // スプルの育ち具合(回答APIが返す)。正解・不正解・結果のスプルにつぼみ・花を付ける
  const [spruGrowth, setSpruGrowth] = useState(0);
  // 回答APIが返す相棒。スプルの隣に出す(やり直しの間は直前の相棒のまま)
  const [partner, setPartner] = useState<AnswerPartner | null>(null);
  const [partnerUp, setPartnerUp] = useState<AnswerPartner | null>(null);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  // 連続プレイの節目に届いた答えのあと、「つぎへ」でお祝いを出すまで覚えておく(設計書4-4)
  const [streakMilestone, setStreakMilestone] = useState<StreakMilestone | null>(null);
  const [streakMilestoneOpen, setStreakMilestoneOpen] = useState(false);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);
  // 「もう一度」のたびに増やし、ステージ開始のカードを出し直す
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    // レベルアップの演出で「新しく買えるようになったアイテム」を見せるため
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShopItems(await res.json());
    });
  }, []);

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
    if (completionSubmitted || currentIndex < round.length) return;

    if (score === round.length) {
      playSound("allCorrect");
    }

    (async () => {
      setCompletionSubmitted(true);
      // やり直しは練習なので、ステージのクリアや復習のやりきりは送らない
      if (mode !== "main") return;
      setFinishNote(await onFinish(stageScore).catch(() => null));
    })();
  }, [round, currentIndex, completionSubmitted, score, stageScore, mode, playSound, onFinish]);

  const finished = currentIndex >= round.length;
  const practice = mode === "retry";

  // 次の問題を出す前にだけ止める。答えた直後の正解の表示と、結果の画面は、HPが0になっても見られる。
  // やり直しは練習なのでHPが0でも遊べる
  if (hpBlocked && !practice && !finished && !answered) {
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-8 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
            <SpruFigure image="sleep" standHeight={96} />
            <h1 className="text-xl font-black">これ以上続けられません</h1>
            <p className="text-sm text-[#6b5d45]">
              スプルもひと休み。HPが回復したらまた遊ぼう
            </p>
            {hpBlockedSecondsLeft > 0 ? (
              <p className="text-3xl font-bold text-[#2e6b1c]">
                {formatMinutesSeconds(hpBlockedSecondsLeft)}
              </p>
            ) : (
              <p className="text-sm text-[#6b5d45]">
                確認しています...
              </p>
            )}
            <Link href="/">
              <AppButton variant="default">ホームに戻る</AppButton>
            </Link>
          </div>
        </div>
        <BottomNav />
      </SkyPage>
    );
  }

  const question = round[currentIndex];
  const isLastQuestion = currentIndex === round.length - 1;

  async function submitAnswer(body: Record<string, unknown>) {
    if (answered || submitting) return;
    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/questions/${question.id}/answer`, {
        method: "POST",
        body: JSON.stringify(practice ? { ...body, practice: true } : body),
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
      setCorrectChoiceId(data.correct_choice_id ?? null);
      setMatchingResults(data.results ?? null);
      setAnswered(true);
      setLastCorrect(Boolean(data.correct));
      playSound(data.correct ? "correct" : "incorrect");
      setLastDelta(data.profile?.delta ?? null);
      if (!data.correct) setMissedIds((prev) => [...prev, question.id]);
      if (data.profile) {
        applyPartial({
          hp: data.profile.hp,
          max_hp: data.profile.max_hp,
          hp_regen_seconds: data.profile.hp_regen_seconds,
          coins: data.profile.coins,
          points: data.profile.points,
          xp: data.profile.xp,
          level: data.profile.level,
          current_streak: data.profile.streak,
        });
        const growth: number = data.profile.spru_growth ?? 0;
        setSpruGrowth(growth);
        if (data.profile.leveled_up) {
          setLevelUp({
            level: data.profile.level,
            previousLevel: profile?.level ?? data.profile.level - 1,
            growthLine: levelUpGrowthLine(growth, Boolean(data.profile.garden_busy)),
            bloom: bloomOf(growth),
          });
        }
        const answerPartner: AnswerPartner | null = data.profile.partner ?? null;
        setPartner(answerPartner);
        setPartnerUp(answerPartner?.hearts_up ? answerPartner : null);
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
      if (data.profile?.streak_milestone) {
        setStreakMilestone({
          days: data.profile.streak_milestone,
          first: Boolean(data.profile.streak_milestone_first),
          bonusCoin: data.profile.streak_milestone_bonus_coin ?? 0,
        });
      }
      if (data.correct) setScore((prev) => prev + 1);
      if (data.correct && countsTowardScore(question)) setStageScore((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelect(choiceId: number) {
    setSelectedChoiceId(choiceId);
    await submitAnswer({ choice_id: choiceId });
  }

  async function handleMatchingSubmit(
    answers: { item_id: string; choice_id: number }[],
  ) {
    await submitAnswer({ answers });
  }

  async function handleOrderingSubmit(answerOrder: number[]) {
    await submitAnswer({ answer_order: answerOrder });
  }

  async function handleSortingSubmit(
    assignments: { item_id: string; basket_id: string }[],
  ) {
    await submitAnswer({ assignments });
  }

  function advance() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setMatchingResults(null);
    setAnswered(false);
    setLastDelta(null);
    setPartnerUp(null);
  }

  function handleNext() {
    // レベルが上がったときは、次の問題(最後なら結果画面)の前にお祝いを挟む
    if (levelUp && !levelUpOpen) {
      setLevelUpOpen(true);
      playSound("allCorrect");
      return;
    }
    if (openStreakMilestone()) return;
    advance();
  }

  // 連続プレイの節目に届いたときは、レベルアップのあとにお祝いを挟む。出したら true
  function openStreakMilestone(): boolean {
    if (!streakMilestone || streakMilestoneOpen) return false;
    setStreakMilestoneOpen(true);
    playSound("allCorrect");
    return true;
  }

  function handleLevelUpContinue() {
    setLevelUp(null);
    setLevelUpOpen(false);
    if (openStreakMilestone()) return;
    advance();
  }

  function handleMilestoneContinue() {
    setStreakMilestone(null);
    setStreakMilestoneOpen(false);
    advance();
  }

  // 「もう一度」とやり直しで共通の、1周ぶんの状態を最初に戻す
  function resetRun() {
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setMatchingResults(null);
    setAnswered(false);
    setLastDelta(null);
    setCombo(null);
    setStreak(null);
    setScore(0);
    setStageScore(0);
    setCompletionSubmitted(false);
    setLevelUp(null);
    setLevelUpOpen(false);
    setStreakMilestone(null);
    setStreakMilestoneOpen(false);
    setMissedIds([]);
    setPartnerUp(null);
  }

  function handleRestart() {
    resetRun();
    setRound(questions);
    setMode("main");
    setFinishNote(null);
    setRunId((prev) => prev + 1);
  }

  function handleRetry() {
    resetRun();
    setRound(retryRound(round, missedIds, Math.random));
    setMode("retry");
  }

  if (finished) {
    const result = pickResult(score, round.length);
    const missedCount = missedIds.length;
    return (
      <SkyPage>
        <AppHeader />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-[#fffaf0] p-8 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
            <div className="flex items-end gap-3">
              <SpruFigure image={result.image} standHeight={96} bloom={bloomOf(spruGrowth)} className={result.image === "jump" ? "animate-spru-hop" : undefined} />
              {partner && <CompanionImage companionKey={partner.key} standHeight={96} />}
              {!practice && score === round.length && <BadgeImage badge="trophy" size={72} alt="全問正解のトロフィー" />}
            </div>
            <h1 className="text-2xl font-black">{practice ? "もう一度チャレンジ" : "結果発表"}</h1>
            <p className="text-4xl font-bold text-[#2e6b1c]">
              {score} / {round.length} 問正解
            </p>
            {result.line && <p className="text-sm font-semibold text-[#6b5d45]">{result.line}</p>}
            {!practice && finishNote}
            <div className="flex flex-wrap justify-center gap-3">
              {missedCount > 0 && (
                <AppButton variant="primary" onClick={handleRetry}>
                  まちがえた{missedCount}問に もう一度チャレンジ
                </AppButton>
              )}
              {allowRestart && !practice && (
                <AppButton variant={missedCount > 0 ? "default" : "primary"} onClick={handleRestart}>
                  もう一度
                </AppButton>
              )}
              <Link href="/">
                <AppButton variant="default">{backLabel}</AppButton>
              </Link>
            </div>
          </div>
        </div>
        <BottomNav />
      </SkyPage>
    );
  }

  const correctChoiceLabel = question.choices.find(
    (c) => c.id === correctChoiceId,
  )?.label;

  return (
    <SkyPage>
      <GameHeader />
      {currentIndex === 0 && !practice && stageNumber !== null && <StageStartCard key={runId} stageNumber={stageNumber} />}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="relative flex flex-col gap-8 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          {/* 「へん？」の報告(問題が変わるたびに作り直す) */}
          <div className="absolute top-3 right-3 z-10">
            <ReportQuestion key={question.id} questionId={question.id} />
          </div>
          <div>
            <p className="flex items-center gap-2 pr-16 text-sm text-[#6b5d45]">
              {practice ? "もう一度チャレンジ" : title}
              <span>
                ・ 問題 {currentIndex + 1} / {round.length}
              </span>
              {question.review && !practice && (
                <span className="rounded-full bg-[#2b6fa3] px-2 py-0.5 text-[10px] font-black text-white">
                  <AutoFurigana text="おさらい" />
                </span>
              )}
            </p>
            {question.meta?.image ? (
              <div className="relative mx-auto mt-4 h-32 w-52 overflow-hidden rounded-lg border border-[#e8dfcf] shadow-sm">
                <Image
                  src={question.meta.image}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              question.country && (
                <div className="relative mx-auto mt-4 h-28 w-44 overflow-hidden rounded-lg border border-[#e8dfcf] shadow-sm">
                  <Image
                    src={`/flag/${question.country.code}.svg`}
                    alt={question.country.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )
            )}
            <h1 className="mt-2 text-xl font-black">
              <AutoFurigana text={question.prompt} />
            </h1>
          </div>

          {question.type === "matching" ? (
            <MatchingQuestion
              items={question.meta?.items ?? []}
              choices={question.choices}
              answered={answered}
              results={matchingResults}
              submitting={submitting}
              onSubmit={handleMatchingSubmit}
            />
          ) : question.type === "ordering" ? (
            <OrderingQuestion
              choices={question.choices}
              answered={answered}
              submitting={submitting}
              onSubmit={handleOrderingSubmit}
            />
          ) : question.type === "sorting" ? (
            <SortingQuestion
              items={question.meta?.items ?? []}
              baskets={question.meta?.baskets ?? []}
              answered={answered}
              submitting={submitting}
              onSubmit={handleSortingSubmit}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question.choices.map((choice) => {
                const variant = choiceTone({
                  answered,
                  isCorrect: choice.id === correctChoiceId,
                  isSelected: choice.id === selectedChoiceId,
                });

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
          )}

        </div>
      </div>
      {/* 正解・不正解のカード(設計書2章の案A)。空は明るいまま、クリーム色のカードで知らせる。fixed の基準がずれないよう、問題のカードの外に置く */}
      {answered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(143,212,233,0.55)] px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="answer-headline"
            className="animate-pop-in flex max-h-[90vh] w-full max-w-[360px] flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-end gap-3">
              <SpruFigure
                key={currentIndex}
                image={pickAnswerImage({
                  correct: lastCorrect,
                  combo: combo?.combo ?? 0,
                  comboBonus: combo?.combo_milestone_bonus_coin ?? 0,
                })}
                standHeight={100}
                bloom={bloomOf(spruGrowth)}
                className="animate-pop-in"
              />
              {partner && (
                <CompanionImage
                  key={`partner-${currentIndex}`}
                  companionKey={partner.key}
                  standHeight={100}
                  className="animate-pop-in"
                />
              )}
            </div>
            <p id="answer-headline" className={`text-4xl font-black ${lastCorrect ? "text-[#2e6b1c]" : "text-[#b4472c]"}`}>
              {answerHeadline(lastCorrect)}
            </p>
            {lastCorrect ? (
              <>
                <p className="flex gap-4 text-base font-black text-[#2e6b1c]">
                  {typeof lastDelta?.xp === "number" && <span>+{lastDelta.xp}XP</span>}
                  {typeof lastDelta?.coin === "number" && <span>+{lastDelta.coin}Coin</span>}
                  {typeof lastDelta?.point === "number" && <span>+{lastDelta.point}pt</span>}
                </p>
                {combo && combo.combo >= 2 && (
                  <p className="flex items-center gap-1 text-base font-black text-[#c2402c]">
                    <BadgeImage badge="streak" size={22} />
                    {combo.combo}コンボ！
                  </p>
                )}
                {combo && combo.combo_milestone_bonus_coin > 0 && (
                  <p className="text-sm font-bold text-[#7a5a0e]">ボーナス +{combo.combo_milestone_bonus_coin}Coin</p>
                )}
                {partnerUp && (
                  <div className="flex w-full flex-col items-center gap-1 rounded-2xl bg-[#fdeef2] px-4 py-2">
                    <p className="text-sm font-black text-[#b03a64]">
                      <AutoFurigana text={`${partnerUp.name}とのなかよし度が上がった！`} />
                    </p>
                    <p className="text-lg tracking-widest text-[#d9467a]" aria-label={`ハート${partnerUp.hearts}つ`}>
                      {heartsText(partnerUp.hearts)}
                    </p>
                    {partnerUp.new_line && (
                      <p className="text-sm font-bold">
                        <AutoFurigana text={`「${partnerUp.new_line}」`} />
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-base font-bold text-[#6b5d45]">
                {typeof lastDelta?.hp === "number" && (
                  <span className="flex items-center gap-1 text-[#c2402c]">
                    <BadgeImage badge="hp" size={22} />
                    {lastDelta.hp}
                  </span>
                )}
                {correctChoiceLabel && (
                  <span className="flex items-center gap-1">
                    こたえは「<ChoiceLabel label={correctChoiceLabel} />」
                  </span>
                )}
              </div>
            )}
            {streak?.streak_extended_today && (
              <p className="flex items-center gap-1 text-sm font-bold text-[#c2402c]">
                <BadgeImage badge="streak" size={20} />
                {streak.streak}日連続プレイ！
                {streakLineBonusCoin(streak.streak_milestone_bonus_coin, streakMilestone?.days ?? null) > 0 &&
                  ` ボーナス+${streak.streak_milestone_bonus_coin}Coin`}
              </p>
            )}

            <AppButton variant="primary" size="lg" onClick={handleNext} className="mt-1 w-full">
              {isLastQuestion ? "結果を見る ▶" : "次へ ▶"}
            </AppButton>
          </div>
        </div>
      )}
      {levelUpOpen && levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          unlocked={shopItems.filter(
            (item) =>
              item.type === "decoration" && item.min_level > levelUp.previousLevel && item.min_level <= levelUp.level,
          )}
          growthLine={levelUp.growthLine}
          bloom={levelUp.bloom}
          onContinue={handleLevelUpContinue}
        />
      )}
      {streakMilestoneOpen && streakMilestone && (
        <StreakMilestoneOverlay
          days={streakMilestone.days}
          first={streakMilestone.first}
          bonusCoin={streakMilestone.bonusCoin}
          onContinue={handleMilestoneContinue}
        />
      )}
    </SkyPage>
  );
}
