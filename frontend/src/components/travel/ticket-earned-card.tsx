import Link from "next/link";
import { Ticket } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";

/** ボスを倒してチケットを手に入れたとき、クイズの結果に出すカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4) */
export function TicketEarnedCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[#f2b632] bg-[#fff4d6] px-4 py-3 text-center">
      <p className="flex items-center gap-2 text-base font-black text-[#7a5a0e]">
        <Ticket aria-hidden className="h-6 w-6 text-[#d8352a]" />
        <span>
          <AutoFurigana text="チケットを手に入れた！" />
        </span>
      </p>
      <p className="text-sm font-bold text-[#6b5d45]">
        <AutoFurigana text="『せかい』で次の国を選ぼう" />
      </p>
      <Link href="/trip" className="rounded-full bg-[#3b7f26] px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#285a19]">
        せかいへ
      </Link>
    </div>
  );
}
