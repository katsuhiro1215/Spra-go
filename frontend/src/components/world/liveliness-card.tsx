import { AutoFurigana } from "@/components/app/auto-furigana";

import { LIVELINESS_HINTS, livelinessNextText, livelinessStars, type Liveliness } from "./liveliness";

/** ［にぎやか度］を押したときのカード(設計書5-3) */
export function LivelinessCard({ lively, onClose }: { lively: Liveliness; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="liveliness-title"
        className="relative flex w-full max-w-[480px] flex-col gap-2 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="liveliness-title" className="text-lg font-black">
          <AutoFurigana text="町のにぎやか度" />
        </h2>
        <p className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#e0a100]" aria-label={`星${lively.level}つ`}>
            {livelinessStars(lively.level)}
          </span>
          <span className="text-base font-black">
            <AutoFurigana text={lively.label} />
          </span>
        </p>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={livelinessNextText(lively)} />
        </p>
        <ul className="mt-1 flex flex-col gap-1 rounded-2xl bg-[#f5efe1] p-3 text-[13px] font-bold text-[#5a4a30]">
          {LIVELINESS_HINTS.map((hint) => (
            <li key={hint}>
              <AutoFurigana text={hint} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
