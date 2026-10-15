"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { SPRU_SCENES } from "@/components/spru/spru-assets";
import { ruleLines } from "@/lib/stage-timer";

/**
 * ステージの始まりのルールのカード(docs/design/2026-10-15-stage-rules-design.md 4-1)。
 * 「何問中何問でクリアか」「1問の時間」「まちがえるとHP−1」を見せ、スタートのボタンを押すと始まる(時間は、押したあとから数える)
 */
export function StageRulesCard({
  stageNumber,
  themeName = null,
  playCount,
  required,
  isBoss,
  seconds,
  onStart,
}: {
  stageNumber: number;
  themeName?: string | null;
  playCount: number;
  required: number;
  isBoss: boolean;
  seconds: number | null;
  onStart: () => void;
}) {
  const scene = SPRU_SCENES.challenge;
  const lines = ruleLines({ playCount, required, isBoss, seconds });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(143,212,233,0.55)] px-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-rules-title"
        className="animate-pop-in flex w-full max-w-[360px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.2)]"
      >
        <Image
          src={scene.src}
          alt=""
          width={120}
          height={Math.round((120 * scene.height) / scene.width)}
          className="rounded-xl"
          aria-hidden
        />
        <p id="stage-rules-title" className="text-2xl font-black">
          Stage {stageNumber}
        </p>
        {themeName ? (
          <p className="-mt-1 rounded-full bg-[#dff1fb] px-3 py-1 text-base font-black text-[#2b6fa3]">
            <AutoFurigana text={themeName} />
          </p>
        ) : null}
        <ul className="flex flex-col gap-1 text-base font-black">
          {lines.map((line) => (
            <li key={line}>
              <AutoFurigana text={line} />
            </li>
          ))}
        </ul>
        <AppButton variant="primary" size="lg" onClick={onStart} className="mt-1 w-full">
          スタート
        </AppButton>
      </div>
    </div>
  );
}
