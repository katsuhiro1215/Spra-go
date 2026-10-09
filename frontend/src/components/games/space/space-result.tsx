"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { rewardLines } from "@/components/games/catch/catch-view";
import { LevelUpOverlay } from "@/components/quiz/level-up-overlay";
import { SpruFigure } from "@/components/spru/spru-figure";
import type { ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

import type { SpaceFinish } from "./space-api";
import { isPerfect, type SpaceState } from "./space-engine";
import { DESTINATIONS, destinationLine, missedQuestions } from "./space-view";

/** 結果の画面(docs/design/2026-10-09-space-trip-design.md 4章) */
export function SpaceResult({
  result,
  state,
  starting,
  onRetry,
  onChangeDifficulty,
}: {
  result: SpaceFinish;
  state: SpaceState;
  starting: boolean;
  onRetry: () => void;
  onChangeDifficulty: () => void;
}) {
  const { play: playSound } = useSound();
  const perfect = isPerfect(state);
  const missed = missedQuestions(state);
  const lines = rewardLines(result.reward);
  const destination = DESTINATIONS[result.destination];
  const [levelUpOpen, setLevelUpOpen] = useState(result.leveled_up);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);
  const [pictureFailed, setPictureFailed] = useState(false);

  useEffect(() => {
    if (perfect) playSound("allCorrect");
  }, [perfect, playSound]);

  useEffect(() => {
    if (!result.leveled_up) return;
    apiFetch("/api/shop")
      .then(async (res) => {
        if (res.ok) setShopItems(await res.json());
      })
      .catch(() => {});
  }, [result.leveled_up]);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-10 pb-24 text-center">
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* 到着した星。絵が届くまでは、色のついた丸(絵が無ければ丸のまま) */}
          <span aria-hidden className="absolute inset-3 rounded-full" style={{ backgroundColor: destination?.color ?? "#8fa0d8" }} />
          {!pictureFailed && (
            <Image
              src={`/space/${result.destination}.webp`}
              alt=""
              fill
              sizes="112px"
              className="object-contain"
              onError={() => setPictureFailed(true)}
            />
          )}
        </div>
        <p className="text-lg font-black text-[#2e4a9a]">
          <AutoFurigana text={destinationLine(result.destination)} />
        </p>
        <SpruFigure image="happy" bloom={perfect ? "flower" : null} standHeight={90} alt="喜ぶスプル" />
        {result.new_best && (
          <p className="animate-pop-in rounded-full bg-[#f2b632] px-3 py-1 text-sm font-black">
            <AutoFurigana text="新記録！" />
          </p>
        )}
        <p className="text-4xl font-black">{result.score}点</p>
        <p className="text-sm font-bold">
          <AutoFurigana text={`正解 ${result.correct_count}/${state.questions.length}　星 ${result.stars}　いちばん長いコンボ ${result.best_combo}`} />
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
            <AutoFurigana text="まちがえた問題" />
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {missed.map((item, index) => (
              <li key={index} className="flex flex-wrap items-center gap-x-2">
                <span className="font-bold">
                  <AutoFurigana text={item.focus + item.rest} />
                </span>
                <span aria-hidden>→</span>
                {item.answerImage ? (
                  <span className="relative block aspect-square w-12 overflow-hidden rounded-sm border border-[#e8dfcf] bg-white">
                    <Image src={item.answerImage} alt={item.answer} fill sizes="48px" className="object-contain" />
                  </span>
                ) : (
                  <span>
                    <AutoFurigana text={item.answer} />
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
