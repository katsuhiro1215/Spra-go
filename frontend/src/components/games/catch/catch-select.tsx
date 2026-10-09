"use client";

import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";
import { DIFFICULTY_READINGS } from "@/lib/difficulty";

import type { CatchDifficulty, CatchSummary } from "./catch-api";
import { CATCH_MODES, laneLabel, rewardLeftText, type CatchMode } from "./catch-view";

/** 難しさを選ぶ画面(docs/design/2026-09-29-spru-catch-design.md 7-2) */
export function CatchSelect({
  mode,
  summary,
  starting,
  error,
  onStart,
}: {
  mode: CatchMode;
  summary: CatchSummary;
  starting: boolean;
  error: string | null;
  onStart: (difficulty: CatchDifficulty) => void;
}) {
  const config = CATCH_MODES[mode];
  const allEmpty = summary.difficulties.every((d) => d.available === 0);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-5 px-6 py-10 pb-24 text-center">
      <SpruFigure image="cheer" standHeight={110} alt="スプル" eager />
      <SkyTitle className="text-2xl">{config.title}</SkyTitle>
      <SkyText className="text-sm">
        <AutoFurigana text={config.intro} />
      </SkyText>

      <ol className="flex w-full flex-col gap-2 rounded-3xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
        <li className="text-sm font-black">
          <AutoFurigana text="あそびかた" />
        </li>
        {config.howTo.map((line, index) => (
          <li key={line} className="flex gap-2 text-sm font-bold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5bb33e] text-xs font-black text-white">{index + 1}</span>
            <span>
              <AutoFurigana text={line} />
            </span>
          </li>
        ))}
      </ol>

      {allEmpty ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <p className="text-base font-bold">
            <AutoFurigana text={config.emptyMessage} />
          </p>
          {config.emptyLink && (
            <Link href="/trip">
              <AppButton variant="primary">せかいへ</AppButton>
            </Link>
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {summary.difficulties.map((d) => (
            <AppButton
              key={d.difficulty}
              variant={d.available > 0 ? "default" : "locked"}
              size="lg"
              disabled={d.available === 0 || starting}
              onClick={() => onStart(d.difficulty)}
              className="flex w-full items-center justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <Furigana text={d.difficulty} reading={DIFFICULTY_READINGS[d.difficulty] ?? ""} />
                <span className="text-xs opacity-80">{laneLabel(d.lanes)}</span>
              </span>
              <span className="text-xs opacity-80">
                {d.available === 0 ? "準備中" : d.best_score !== null ? `ベスト ${d.best_score}点` : "はじめて"}
              </span>
            </AppButton>
          ))}
        </div>
      )}

      <p className="text-sm font-bold text-[#3b3226]">
        <AutoFurigana text={rewardLeftText(summary.rewarded_plays_left)} />
      </p>
      {summary.featured && (
        <p className="rounded-full bg-[#fff3c4] px-3 py-1 text-xs font-black text-[#3b3226]">
          <AutoFurigana text="今週のミニゲーム！ごほうびが1.5ばい" />
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-[#c9573b]">
          <AutoFurigana text={error} />
        </p>
      )}
    </div>
  );
}
