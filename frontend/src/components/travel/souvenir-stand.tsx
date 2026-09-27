"use client";

import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";
import { ItemIcon } from "@/components/world/item-art";

import type { Destination, TravelSouvenir } from "./types";

/** 旅先の国のおみやげ屋さん(設計書5-3) */
export function SouvenirStand({
  destination,
  busyKey,
  message,
  onReceive,
}: {
  destination: Destination;
  busyKey: string | null;
  message: { text: string; ok: boolean } | null;
  onReceive: (souvenir: TravelSouvenir) => void;
}) {
  return (
    <section aria-labelledby="souvenir-stand-title" className="flex flex-col gap-3 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg">
      <h2 id="souvenir-stand-title" className="text-base font-black">
        <AutoFurigana text="おみやげ屋さん" />
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {destination.souvenirs.map((souvenir) => (
          <li key={souvenir.key} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#f5efe1] p-3 text-center">
            <div className="relative">
              <ItemIcon assetKey={souvenir.asset_key} size={76} className={souvenir.met || souvenir.received ? "" : "opacity-40 grayscale"} />
              {souvenir.footprint > 1 && (
                <span className="absolute -top-1 -left-3 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                  2×2マス
                </span>
              )}
            </div>
            <p className="text-sm font-black">
              <AutoFurigana text={souvenir.name} />
            </p>
            {souvenir.received ? (
              <p className="text-xs font-black text-[#3b7f26]">
                <AutoFurigana text="受け取りずみ" />
              </p>
            ) : souvenir.met ? (
              <button
                type="button"
                onClick={() => onReceive(souvenir)}
                disabled={busyKey !== null}
                className="h-9 w-full rounded-xl bg-[#d8352a] text-[13px] font-black text-white shadow-[0_3px_0_#9e2219] disabled:opacity-60"
              >
                <AutoFurigana text={busyKey === souvenir.key ? "受け取り中..." : "受け取る"} />
              </button>
            ) : (
              <p className="text-xs font-bold text-[#6b5d45]">
                <AutoFurigana text={`${souvenir.condition_label}しよう`} />
              </p>
            )}
          </li>
        ))}
      </ul>
      {message && (
        <div role="status" className="flex items-center gap-2 rounded-2xl bg-[#f5efe1] p-2">
          {message.ok && <SpruFigure image="happy" standHeight={56} alt="よろこぶスプル" />}
          <p className={`text-sm font-bold ${message.ok ? "text-[#3b3226]" : "text-[#c2402c]"}`}>
            <AutoFurigana text={message.text} />
            {message.ok && (
              <Link href="/bag" className="ml-2 font-black text-[#2b6fa3] underline">
                バッグを見る
              </Link>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
