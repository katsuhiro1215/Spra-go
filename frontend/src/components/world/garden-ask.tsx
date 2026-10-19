import { AutoFurigana } from "@/components/app/auto-furigana";

import type { GardenAsk as Ask } from "./garden";

/**
 * 畑の前に来たSpruが聞く、「水をあげますか？」(docs/design/2026-10-19-garden-layout-design.md)。
 * 画面の下、右下の丸いボタン・下のメニューより上に出す
 */
export function GardenAsk({ ask, busy, onYes, onNo }: { ask: Ask; busy: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div
      role="group"
      aria-label={ask.question}
      className="fixed right-0 bottom-[150px] left-0 z-30 mx-auto flex w-fit max-w-[calc(100vw-16px)] items-center gap-2 rounded-2xl bg-[rgba(255,250,240,0.97)] py-2 pr-2 pl-4 shadow-[0_4px_14px_rgba(59,50,38,0.25)]"
    >
      <p className="text-[15px] font-black text-[#3b3226]">
        <AutoFurigana text={ask.question} />
      </p>
      <button
        type="button"
        onClick={onYes}
        disabled={busy}
        className="h-10 rounded-full bg-[#3b7f26] px-4 text-[14px] font-black text-white shadow-[0_3px_0_#285a19] focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:opacity-50"
      >
        <AutoFurigana text={ask.yes} />
      </button>
      <button
        type="button"
        onClick={onNo}
        disabled={busy}
        className="h-10 rounded-full bg-[#efe6d4] px-4 text-[14px] font-black text-[#5a4526] focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:opacity-50"
      >
        <AutoFurigana text="やめる" />
      </button>
    </div>
  );
}
