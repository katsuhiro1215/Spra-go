import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFace } from "@/components/spru/spru-figure";

import { reviewInvite } from "./companions";

/** 復習の誘い(仲間のカードの一番上と、スプルの復習カードで共通。設計書3-5) */
export function ReviewInvite({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[#fff1dc] p-3">
      <p className="text-sm font-black text-[#8a4b12]">
        <AutoFurigana text={reviewInvite(count)} />
      </p>
      <button
        type="button"
        onClick={onStart}
        className="h-12 rounded-2xl bg-[#f28c28] text-base font-black text-white shadow-[0_4px_0_#c46a12]"
      >
        <AutoFurigana text="やってみる" />
      </button>
    </div>
  );
}

/** スプルが復習を出す日に、スプルをタップしたときのカード */
export function ReviewCard({ count, onStart, onClose }: { count: number; onStart: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-card-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="review-card-title" className="flex items-center gap-2 text-lg font-black">
          <SpruFace face="happy" size={36} />
          <AutoFurigana text="スプルからの復習" />
        </h2>
        <ReviewInvite count={count} onStart={onStart} />
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          あとで
        </button>
      </div>
    </div>
  );
}
