"use client";

import { Check, CircleDashed, Ship } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { ItemIcon } from "@/components/world/item-art";

import { Flag } from "./flag";
import type { Destination } from "./types";

const STATE_TEXT: Record<Destination["state"], string> = { visited: "着いた国", next: "次の行き先", later: "まだ先" };

/** 島を押したときのカード(設計書5-1) */
export function DestinationSheet({
  destination,
  busy,
  error,
  onDepart,
  onGo,
  onClose,
}: {
  destination: Destination;
  busy: boolean;
  error: string | null;
  onDepart: () => void;
  onGo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,40,60,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destination-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-center gap-2.5">
          <Flag src={destination.flag} size={36} />
          <h2 id="destination-sheet-title" className="text-lg font-black">
            {destination.name}
          </h2>
          <span className="rounded-full bg-[#efe5cf] px-2 py-0.5 text-[11px] font-black text-[#6b5d45]">
            <AutoFurigana text={STATE_TEXT[destination.state]} />
          </span>
        </div>

        {destination.state === "next" && (
          <>
            <h3 className="text-sm font-black text-[#6b5d45]">
              <AutoFurigana text="旅のじゅんび" />
            </h3>
            <ul className="flex flex-col gap-2">
              {destination.checklist.map((row) => (
                <li key={`${row.kind}-${row.label}`} className="flex items-start gap-2 rounded-xl bg-[#f5efe1] px-3 py-2">
                  {row.done ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7f26]" strokeWidth={3} />
                  ) : (
                    <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#8a7a5a]" strokeWidth={2.4} />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-black">
                      <AutoFurigana text={row.label} />
                      <span className="sr-only">{row.done ? "(そろった)" : "(まだ)"}</span>
                    </span>
                    {row.hint && (
                      <span className="text-xs font-bold text-[#8a6a3a]">
                        <AutoFurigana text={row.hint} />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onDepart}
              disabled={!destination.ready || busy}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#2b6fa3] text-base font-black text-white shadow-[0_4px_0_#1d4f76] disabled:bg-[#efe5cf] disabled:text-[#6b5d45] disabled:shadow-none"
            >
              <Ship aria-hidden className="h-5 w-5" />
              <span>
                <AutoFurigana text={busy ? "出発中..." : "出発する"} />
              </span>
            </button>
          </>
        )}

        {destination.state === "visited" && (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {destination.souvenirs.map((souvenir) => (
                <li key={souvenir.key} className="flex flex-col items-center gap-1 rounded-xl bg-[#f5efe1] p-2 text-center">
                  <ItemIcon
                    assetKey={souvenir.asset_key}
                    size={52}
                    className={souvenir.met || souvenir.received ? "" : "opacity-40 grayscale"}
                  />
                  <span className="text-xs font-black">{souvenir.name}</span>
                  <span className="text-[11px] font-bold text-[#6b5d45]">
                    <AutoFurigana
                      text={souvenir.received ? "受け取りずみ" : souvenir.met ? "受け取れるよ！" : `${souvenir.condition_label}しよう`}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onGo}
              className="h-[52px] rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
            >
              <AutoFurigana text="行く" />
            </button>
          </>
        )}

        {destination.state === "later" && (
          <p className="rounded-xl bg-[#f5efe1] px-3 py-3 text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="前の国へ行ってからね" />
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-[#c2402c]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
