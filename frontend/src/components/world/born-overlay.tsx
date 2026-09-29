"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";
import { COMPANION_IMAGES, SPRU_BLOOM, type CompanionKey } from "@/components/spru/spru-assets";
import { prefersReducedMotion } from "@/lib/motion";

import { bornLook, bornNote } from "./companions";
import type { BornResult } from "./types";

// 花が咲いてから本人が出るまで(docs/design/2026-09-29-rare-spru-design.md 5-4)
const FLOWER_MS = 800;

/** 3回目の水やりで生まれたときの全画面のお祝い(B回の設計書3-5)。仲間・レアスプルは、先にその子の花が咲く */
export function BornOverlay({ born, onClose }: { born: BornResult; onClose: () => void }) {
  const companion = born.kind === "companion" ? born : null;
  // お祝いは操作の後にだけ出る(サーバーでは描かない)ので、最初の状態で動きを減らす設定を見てよい
  const [bloomed, setBloomed] = useState(() => companion === null || prefersReducedMotion());

  useEffect(() => {
    if (bloomed) return;
    const timer = setTimeout(() => setBloomed(true), FLOWER_MS);
    return () => clearTimeout(timer);
  }, [bloomed]);

  const asset = !companion
    ? SPRU_BLOOM.flower
    : bloomed
      ? COMPANION_IMAGES[companion.key as CompanionKey]
      : plantImage(bornLook(companion), "flower");
  const height = companion ? (bloomed ? 150 : 110) : 80;
  const note = companion ? bornNote(companion) : null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="born-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div className="flex h-[150px] items-end justify-center">
          {asset && (
            <Image
              key={bloomed ? "figure" : "flower"}
              src={asset.src}
              alt={companion ? (bloomed ? companion.name : "") : "スプルの花"}
              width={Math.round((asset.width * height) / asset.height)}
              height={height}
              className={bloomed ? "animate-spru-hop" : "animate-pop-in"}
            />
          )}
        </div>
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
            {note && (
              <p className="text-xs font-bold text-[#8a7a5c]">
                <AutoFurigana text={note} />
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
          {companion && companion.in_town ? "町にむかえる" : "つづける"}
        </button>
      </div>
    </div>
  );
}
