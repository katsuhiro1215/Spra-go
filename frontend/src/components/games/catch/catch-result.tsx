"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { LevelUpOverlay } from "@/components/quiz/level-up-overlay";
import { SpruFigure } from "@/components/spru/spru-figure";
import type { ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

import type { CatchFinish } from "./catch-api";
import { isPerfect, type CatchState } from "./catch-engine";
import { CATCH_MODES, missedWords, rewardLines, type CatchMode } from "./catch-view";

/** 結果の画面(docs/design/2026-09-29-spru-catch-design.md 7-4) */
export function CatchResult({
  mode,
  result,
  state,
  starting,
  onRetry,
  onChangeDifficulty,
}: {
  mode: CatchMode;
  result: CatchFinish;
  state: CatchState;
  starting: boolean;
  onRetry: () => void;
  onChangeDifficulty: () => void;
}) {
  const { play: playSound } = useSound();
  const perfect = isPerfect(state);
  const missed = missedWords(state);
  const lines = rewardLines(result.reward);
  const [levelUpOpen, setLevelUpOpen] = useState(result.leveled_up);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);

  useEffect(() => {
    if (perfect) playSound("allCorrect");
  }, [perfect, playSound]);

  useEffect(() => {
    if (!result.leveled_up) return;
    // レベルアップの画面で「新しく買えるようになったアイテム」を見せるため
    apiFetch("/api/shop")
      .then(async (res) => {
        if (res.ok) setShopItems(await res.json());
      })
      .catch(() => {});
  }, [result.leveled_up]);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-10 pb-24 text-center">
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
        <SpruFigure image="happy" bloom={perfect ? "flower" : null} standHeight={110} alt="喜ぶスプル" />
        {result.new_best && (
          <p className="animate-pop-in rounded-full bg-[#f2b632] px-3 py-1 text-sm font-black">
            <AutoFurigana text="新記録！" />
          </p>
        )}
        <p className="text-4xl font-black">{result.score}点</p>
        <p className="text-sm font-bold">
          <AutoFurigana text={`正解 ${result.correct_count}/${state.questions.length}　いちばん長いコンボ ${result.best_combo}`} />
        </p>
        <p className="text-xs text-[#6b5d45]">
          <AutoFurigana text={`自己ベスト ${result.best_score}点`} />
        </p>
        {lines.length > 0 ? (
          <div className="text-sm font-black text-[#2e6b1c]">
            {lines.map((line) => (
              <p key={line}>
                <AutoFurigana text={line} />
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="今日のごほうびはおしまい。練習になったね" />
          </p>
        )}
      </div>

      {missed.length > 0 && (
        <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.12)]">
          <h2 className="text-sm font-black">
            <AutoFurigana text={CATCH_MODES[mode].missedHeading} />
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {missed.map((word, index) => (
              <li key={index} className="flex flex-wrap gap-x-2">
                <span className="font-bold">
                  <AutoFurigana text={word.focus} />
                </span>
                <span aria-hidden>→</span>
                {word.answerImage ? (
                  <span className="relative block aspect-[3/2] w-16 overflow-hidden rounded-sm border border-[#e8dfcf] bg-white">
                    <Image src={word.answerImage} alt={word.answer} fill sizes="64px" className="object-contain" />
                  </span>
                ) : (
                  <span>
                    <AutoFurigana text={word.answer} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        <AppButton variant="secondary" size="lg" disabled={starting} onClick={onRetry} className="w-full">
          <span>
            <AutoFurigana text="もう一回" />
          </span>
        </AppButton>
        <AppButton variant="default" size="lg" onClick={onChangeDifficulty} className="w-full">
          <span>
            <AutoFurigana text="難しさを変える" />
          </span>
        </AppButton>
        <Link href="/learn">
          <AppButton variant="ghost" className="w-full">
            <span>
              <AutoFurigana text="学ぶにもどる" />
            </span>
          </AppButton>
        </Link>
      </div>

      {levelUpOpen && (
        <LevelUpOverlay
          level={result.level}
          unlocked={shopItems.filter(
            (item) => item.type === "decoration" && item.min_level > result.previous_level && item.min_level <= result.level,
          )}
          onContinue={() => setLevelUpOpen(false)}
        />
      )}
    </div>
  );
}
