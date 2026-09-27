"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { COMPANION_IMAGES, SPRU_BLOOM, type CompanionKey } from "@/components/spru/spru-assets";

import type { BornResult } from "./types";

/** 3回目の水やりで生まれたときの全画面のお祝い(設計書3-5) */
export function BornOverlay({ born, onClose }: { born: BornResult; onClose: () => void }) {
  const companion = born.kind === "companion" ? born : null;
  const asset = companion ? COMPANION_IMAGES[companion.key as CompanionKey] : SPRU_BLOOM.flower;
  const height = companion ? 150 : 80;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="born-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        {asset && (
          <Image
            src={asset.src}
            alt={companion ? companion.name : "スプルの花"}
            width={Math.round((asset.width * height) / asset.height)}
            height={height}
            className="animate-spru-hop"
          />
        )}
        <h2 id="born-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text={companion ? `${companion.name}が生まれた！` : "スプルの花が咲いた！"} />
        </h2>
        {companion ? (
          <>
            <p className="rounded-full bg-[#f5efe1] px-3 py-0.5 text-sm font-black text-[#6b5d45]">
              <AutoFurigana text={companion.trait} />
            </p>
            <p className="text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={`「${companion.lines[0] ?? ""}」`} />
            </p>
            {!companion.is_partner && (
              <p className="text-xs font-bold text-[#8a7a5c]">
                <AutoFurigana text="町でタップすると、相棒にできるよ" />
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="バッグに入れたよ" />
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          {companion ? "町にむかえる" : "つづける"}
        </button>
      </div>
    </div>
  );
}
