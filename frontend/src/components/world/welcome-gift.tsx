"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";

export function WelcomeGift({ amount, busy, onReceive }: { amount: number; busy: boolean; onReceive: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-gift-title"
        className="flex w-full max-w-[322px] flex-col items-center gap-2.5 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
      >
        <Image src="/spru/joy.png" alt="よろこぶSpru" width={110} height={106} className="animate-spru-hop" />
        <h2 id="welcome-gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text="ようこそ、自分の町へ！" />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={`旅のおこづかいだよ。${amount}ptで町にアイテムを置いてみよう。`} />
        </p>
        <button
          type="button"
          onClick={onReceive}
          disabled={busy}
          className="mt-1.5 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19] disabled:opacity-70"
        >
          {busy ? "受け取り中..." : `${amount}ptを受け取る`}
        </button>
      </div>
    </div>
  );
}
