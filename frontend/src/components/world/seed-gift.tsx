"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";

import { seedLabel } from "./garden";
import type { NewSeed } from "./types";

/** 条件を満たして特別な種をもらったときのお祝い(docs/design/2026-09-29-rare-spru-design.md 5-2) */
export function SeedGift({ seeds, onClose }: { seeds: NewSeed[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-gift-title"
        className="animate-pop-in flex max-h-[85vh] w-full max-w-[340px] flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <h2 id="seed-gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text="特別な種をもらった！" />
        </h2>
        <ul className="flex w-full flex-col gap-2">
          {seeds.map((seed) => {
            const asset = plantImage(seed.key, "seed");
            return (
              <li key={seed.key} className="flex items-center gap-3 rounded-2xl bg-[#f5efe1] px-3 py-2 text-left">
                <Image
                  src={asset.src}
                  alt=""
                  width={Math.round((asset.width * 48) / asset.height)}
                  height={48}
                  aria-hidden
                  className="animate-spru-hop"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-black">
                    <AutoFurigana text={seedLabel(seed.name)} />
                  </span>
                  <span className="text-xs font-bold text-[#6b5d45]">
                    <AutoFurigana text={seed.reason} />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text="畑にまいてみよう" />
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
