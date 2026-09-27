"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";

import { heartsText, nextHeartText } from "./companions";
import { NicknameForm } from "./nickname-form";
import { ReviewInvite } from "./review-card";
import type { WorldCompanion } from "./types";

/** 仲間をタップしたときのカード(設計書5-2) */
export function CompanionSheet({
  companion,
  reviewCount,
  busy,
  onStartReview,
  onMakePartner,
  onRename,
  onClose,
}: {
  companion: WorldCompanion;
  // 相棒が復習を出す日で、この仲間が相棒のときだけ問題数を渡す(それ以外は null)
  reviewCount: number | null;
  busy: boolean;
  onStartReview: () => void;
  onMakePartner: () => void;
  onRename: (nickname: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        {reviewCount !== null && <ReviewInvite count={reviewCount} onStart={onStartReview} />}
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-16 shrink-0 items-end justify-center rounded-xl bg-[#f5efe1] pb-1">
            <CompanionImage companionKey={companion.key} standHeight={96} />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="companion-sheet-title" className="flex flex-wrap items-center gap-2 text-lg font-black break-all">
              {companion.name}
              {companion.is_partner && (
                <span className="rounded-full bg-[#3b7f26] px-2 py-0.5 text-[11px] font-black text-white">
                  <AutoFurigana text="相棒" />
                </span>
              )}
            </h2>
            {companion.nickname && (
              <p className="text-xs font-bold text-[#6b5d45]">
                <AutoFurigana text={`元の名前: ${companion.official_name}`} />
              </p>
            )}
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text={companion.trait} />
            </p>
            <p className="text-sm font-black text-[#d0467a]">
              <span aria-label={`ハート${companion.hearts}つ`}>{heartsText(companion.hearts)}</span>
              <span className="ml-2 text-xs text-[#6b5d45]">
                <AutoFurigana text={`${companion.heart_label} ・ ${nextHeartText(companion)}`} />
              </span>
            </p>
          </div>
        </div>
        {editing ? (
          <NicknameForm
            initial={companion.nickname ?? ""}
            placeholder={companion.official_name}
            submitLabel="決める"
            cancelLabel="やめる"
            onSubmit={async (nickname) => {
              const error = await onRename(nickname);
              if (error === null) setEditing(false);
              return error;
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {!companion.is_partner && (
              <button
                type="button"
                disabled={busy}
                onClick={onMakePartner}
                className="h-12 rounded-2xl bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
              >
                <AutoFurigana text="相棒にする" />
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="h-12 rounded-2xl bg-[#efe5cf] text-base font-black">
              <AutoFurigana text="名前を変える" />
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
