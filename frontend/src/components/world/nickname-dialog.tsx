"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";

import { NicknameForm } from "./nickname-form";
import type { WorldCompanion } from "./types";

/** 最初の仲間が生まれて相棒になったときの名前付け(設計書5-3) */
export function NicknameDialog({
  companion,
  onSubmit,
  onSkip,
}: {
  companion: WorldCompanion;
  onSubmit: (nickname: string | null) => Promise<string | null>;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <CompanionImage companionKey={companion.key} standHeight={150} className="animate-spru-hop" />
        <h2 id="nickname-title" className="text-xl font-black text-[#2e6b1c]">
          <AutoFurigana text="相棒になってくれるって！名前をつけよう" />
        </h2>
        <div className="w-full text-left">
          <NicknameForm
            initial=""
            placeholder={companion.official_name}
            submitLabel="決める"
            cancelLabel="このままでいい"
            onSubmit={onSubmit}
            onCancel={onSkip}
          />
        </div>
      </div>
    </div>
  );
}
