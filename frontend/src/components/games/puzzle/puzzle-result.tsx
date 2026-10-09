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
import { formatTime } from "@/lib/slide-puzzle";

import type { PuzzleFinish } from "./puzzle-api";

/** 結果の画面: 正解の数・パズルにかかった時間・自己ベスト・ごほうび(docs/design/2026-10-09-slide-puzzle-design.md 1章) */
export function PuzzleResult({
  result,
  total,
  missed,
  starting,
  onRetry,
  onChangeDifficulty,
}: {
  result: PuzzleFinish;
  total: number;
  missed: { picture: string; name: string }[];
  starting: boolean;
  onRetry: () => void;
  onChangeDifficulty: () => void;
}) {
  const { play: playSound } = useSound();
  const perfect = result.correct_count === total;
  const lines = rewardLines(result.reward);
  const [levelUpOpen, setLevelUpOpen] = useState(result.leveled_up);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);

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
        <SpruFigure image="happy" bloom={perfect ? "flower" : null} standHeight={90} alt="喜ぶスプル" />
        {result.new_best_time && (
          <p className="animate-pop-in rounded-full bg-[#f2b632] px-3 py-1 text-sm font-black">
            <AutoFurigana text="ベストタイム！" />
          </p>
        )}
        <p className="text-sm font-bold">
          <AutoFurigana text="かかった時間" />
        </p>
        <p className="text-4xl font-black">{result.elapsed_ms != null ? formatTime(result.elapsed_ms) : "-"}</p>
        {result.best_ms != null && (
          <p className="text-xs text-[#6b5d45]">
            <AutoFurigana text={`自己ベスト ${formatTime(result.best_ms)}`} />
          </p>
        )}
        <p className="text-sm font-bold">
          <AutoFurigana text={`正解 ${result.correct_count}/${total}`} />
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
            <AutoFurigana text="まちがえたもの" />
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {missed.map((item, index) => (
              <li key={index} className="flex items-center gap-3">
                <span className="relative block h-10 w-14 overflow-hidden rounded-sm border border-[#e8dfcf] bg-[#1d2a55]">
                  <Image src={item.picture} alt={item.name} fill sizes="56px" className="object-contain" />
                </span>
                <span className="font-bold">
                  <AutoFurigana text={item.name} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        <AppButton variant="secondary" size="lg" disabled={starting} onClick={onRetry} className="w-full">
          <AutoFurigana text="もう一回" />
        </AppButton>
        <AppButton variant="default" size="lg" onClick={onChangeDifficulty} className="w-full">
          <AutoFurigana text="難しさを変える" />
        </AppButton>
        <Link href="/learn">
          <AppButton variant="ghost" className="w-full">
            <AutoFurigana text="学ぶにもどる" />
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
