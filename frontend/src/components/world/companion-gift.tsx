"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";

import type { WorldCompanion } from "./types";

/** レベルで新しい仲間に会えたときのお祝い(docs/design/2026-10-08-town-growth-design.md 4-2)。1人ずつ出す */
export function CompanionGift({ companion, last, onNext }: { companion: WorldCompanion; last: boolean; onNext: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-gift-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div className="flex h-[150px] items-end justify-center">
          <CompanionImage companionKey={companion.key} standHeight={170} className="animate-spru-hop" />
        </div>
        <h2 id="companion-gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text={`${companion.name}がなかまになった！`} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={companion.lines[0] ?? ""} />
        </p>
        <button
          type="button"
          onClick={onNext}
          className="mt-1 min-h-12 w-full rounded-2xl bg-[#3f8f2b] px-4 text-lg font-black text-white shadow-[0_3px_0_#2b6a1c] active:translate-y-[2px] active:shadow-none"
        >
          <AutoFurigana text={last ? "やったー！" : "つぎへ"} />
        </button>
      </div>
    </div>
  );
}
