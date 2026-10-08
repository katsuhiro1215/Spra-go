"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { giftLine, giftTitle, sizeLabel, type PendingGift } from "./gifts";
import { ItemIcon } from "./item-art";

/** 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4)。あとで選ぶこともできる */
export function GiftPicker({
  gift,
  busy,
  error,
  onChoose,
  onLater,
}: {
  gift: PendingGift;
  busy: boolean;
  error: string | null;
  onChoose: (shopItemId: number) => void;
  onLater: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-title"
        className="animate-pop-in flex max-h-[88vh] w-full max-w-[360px] flex-col gap-3 overflow-y-auto rounded-3xl bg-[#fffaf0] px-4 pt-5 pb-4 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <h2 id="gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text={giftTitle(gift.level)} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={giftLine()} />
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {gift.candidates.map((candidate) => {
            const on = selected === candidate.shop_item_id;
            return (
              <li key={candidate.shop_item_id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(candidate.shop_item_id)}
                  className={`flex min-h-[132px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 ${
                    on ? "border-[#3f8f2b] bg-[#eef7e6]" : "border-transparent bg-[#f5efe1]"
                  }`}
                >
                  <ItemIcon assetKey={candidate.asset_key} size={72} />
                  <span className="text-sm font-black">
                    <AutoFurigana text={candidate.name} />
                  </span>
                  <span className="text-xs font-bold text-[#6b5d45]">{sizeLabel(candidate.footprint)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="text-sm font-bold text-[#b3402a]">
            <AutoFurigana text={error} />
          </p>
        )}
        <button
          type="button"
          disabled={selected === null || busy}
          onClick={() => selected !== null && onChoose(selected)}
          className="min-h-12 w-full rounded-2xl bg-[#3f8f2b] px-4 text-lg font-black text-white shadow-[0_3px_0_#2b6a1c] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          <AutoFurigana text="これにする" />
        </button>
        <button type="button" onClick={onLater} className="min-h-11 text-sm font-bold text-[#6b5d45] underline">
          <AutoFurigana text="あとで えらぶ" />
        </button>
      </div>
    </div>
  );
}
