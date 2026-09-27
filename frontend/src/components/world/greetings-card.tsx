import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import type { WorldGreeting } from "./types";

/** 家族からあいさつが届いていたとき(設計書5-6) */
export function GreetingsCard({ greetings, onClose }: { greetings: WorldGreeting[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="greetings-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <SpruFigure image="jump" standHeight={110} className="animate-spru-hop" />
        <h2 id="greetings-title" className="text-lg font-black text-[#2e6b1c]">
          <AutoFurigana text="家族が遊びに来てくれたよ！" />
        </h2>
        <ul className="flex max-h-[40vh] w-full flex-col gap-1.5 overflow-y-auto">
          {greetings.map((greeting) => (
            <li key={greeting.id} className="rounded-2xl bg-white px-3 py-2 text-sm font-bold break-all">
              <AutoFurigana text={`${greeting.from.name}が遊びに来てくれたよ！「${greeting.text}」`} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          <AutoFurigana text="ありがとう" />
        </button>
      </div>
    </div>
  );
}
