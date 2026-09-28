"use client";

import { useAccessibility } from "@/components/app/accessibility-provider";
import { AutoFurigana } from "@/components/app/auto-furigana";

const FONT_SCALE_LABELS = {
  base: "標準",
  lg: "大",
  xl: "特大",
} as const;

type FontScaleKey = keyof typeof FONT_SCALE_LABELS;

/** ふりがなのオン・オフと文字の大きさ(設計書4-3)。「じぶん」・クイズ中の「文A」・右下の「文A」で使う */
export function DisplaySettings() {
  const { fontScale, setFontScale, furigana, toggleFurigana } = useAccessibility();

  return (
    <div className="flex flex-col gap-3 text-[#3b3226]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">ふりがな</span>
        <button
          type="button"
          role="switch"
          aria-checked={furigana}
          aria-label="ふりがな"
          onClick={toggleFurigana}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${furigana ? "bg-[#5bb33e]" : "bg-[#d9cdb4]"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${furigana ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black whitespace-nowrap">
          <AutoFurigana text="文字の大きさ" />
        </span>
        <div role="group" aria-label="文字の大きさ" className="flex shrink-0 rounded-full bg-[#efe5cf] p-0.5">
          {(Object.keys(FONT_SCALE_LABELS) as FontScaleKey[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setFontScale(scale)}
              aria-pressed={fontScale === scale}
              className={`rounded-full px-3 py-1 text-xs font-black whitespace-nowrap ${
                fontScale === scale ? "bg-[#3b7f26] text-white" : "text-[#6b5d45]"
              }`}
            >
              {FONT_SCALE_LABELS[scale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
