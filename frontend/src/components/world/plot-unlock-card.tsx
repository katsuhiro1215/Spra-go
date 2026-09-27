"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import { unlockLine, unlockTitle } from "./land";
import type { WorldPlot } from "./types";

/** 区画が開いた後に町を開いたときのお祝い(設計書3-2・5-2) */
export function PlotUnlockCard({ plots, onView }: { plots: WorldPlot[]; onView: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plot-unlock-title"
        className="flex w-full max-w-[322px] flex-col items-center gap-2.5 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
      >
        <SpruFigure image="cheer" standHeight={120} alt="よろこぶスプル" className="animate-spru-hop" />
        <h2 id="plot-unlock-title" className="text-xl font-black text-[#2e6b1c]">
          <AutoFurigana text={unlockTitle(plots)} />
        </h2>
        <ul className="flex flex-col gap-1 text-sm font-bold text-[#6b5d45]">
          {plots.map((plot) => (
            <li key={plot.key}>
              <AutoFurigana text={`${plot.name}: ${unlockLine(plot.key)}`} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onView}
          className="mt-1.5 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          <AutoFurigana text="見に行く" />
        </button>
      </div>
    </div>
  );
}
