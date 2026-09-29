"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";

import { seedOptions } from "./garden";
import type { WorldGarden } from "./types";

/** 空いている畑をタップしたときの「どの種をまく？」(docs/design/2026-09-29-rare-spru-design.md 5-3) */
export function SeedPicker({
  garden,
  busy,
  onPick,
  onClose,
}: {
  garden: WorldGarden;
  busy: boolean;
  onPick: (seed: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-picker-title"
        className="relative flex w-full max-w-[480px] flex-col gap-2 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="seed-picker-title" className="text-center text-lg font-black text-[#2e6b1c]">
          <AutoFurigana text="どの種をまく？" />
        </h2>
        {seedOptions(garden).map((option) => {
          const asset = plantImage(option.look, "seed");
          return (
            <button
              key={option.seed}
              type="button"
              disabled={busy}
              onClick={() => onPick(option.seed)}
              className="flex h-16 items-center gap-3 rounded-2xl bg-[#f5efe1] px-3 text-left disabled:opacity-60"
            >
              <Image src={asset.src} alt="" width={Math.round((asset.width * 44) / asset.height)} height={44} aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-black">
                  <AutoFurigana text={option.label} />
                </span>
                {option.note && (
                  <span className="text-xs font-bold text-[#6b5d45]">
                    <AutoFurigana text={option.note} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          やめる
        </button>
      </div>
    </div>
  );
}
