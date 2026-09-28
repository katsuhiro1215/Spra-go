import Link from "next/link";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_TRAVEL } from "@/components/spru/spru-assets";

/** ボスを倒してチケットを手に入れたとき、クイズの結果に出すカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4。絵は docs/design/2026-09-29-spru-icons-design.md 4-7) */
export function TicketEarnedCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[#f2b632] bg-[#fff4d6] px-4 py-3 text-center">
      <AssetImage asset={SPRU_TRAVEL.ticket} size={56} />
      <p className="text-base font-black text-[#7a5a0e]">
        <AutoFurigana text="チケットを手に入れた！" />
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
