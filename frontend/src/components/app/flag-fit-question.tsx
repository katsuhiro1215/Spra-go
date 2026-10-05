"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import type { MatchingChoice, MatchingItem, MatchingResult } from "@/components/app/matching-question";
import {
  SLOT_MARKS,
  correctItemId,
  emptySlots,
  placeFlag,
  removeFlag,
  seededOrder,
  slotAnswers,
  slotsFull,
  unplacedItems,
} from "@/lib/flag-fit";
import { cn } from "@/lib/utils";

type Props = {
  questionId: number;
  items: MatchingItem[];
  choices: MatchingChoice[];
  answered: boolean;
  results: MatchingResult[] | null;
  submitting: boolean;
  onSubmit: (answers: { item_id: string; choice_id: number }[]) => void;
};

/** 国旗の絵(3:2)。切り取らずに全体を見せる */
function Flag({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-[3/2] overflow-hidden rounded-sm border border-[#e8dfcf] bg-white", className)}>
      <Image src={src} alt="" fill sizes="120px" className="object-contain" />
    </span>
  );
}

/**
 * 国旗のはめ込み(docs/design/2026-10-05-flag-quiz-design.md 7-2)。
 * 上に番号つきの国名の枠。下の国旗をタップすると、いちばん上の空いている枠に入る。入れた国旗をタップすると戻る。
 * 全部入ったら、自動で答え合わせ(送れなかったときのために「答え合わせ」のボタンも出す)
 */
export function FlagFitQuestion({ questionId, items, choices, answered, results, submitting, onSubmit }: Props) {
  const [slots, setSlots] = useState(() => emptySlots(choices.length));
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const tray = useMemo(() => seededOrder(items, questionId), [items, questionId]);
  const resultByItem = new Map((results ?? []).map((result) => [result.item_id, result]));
  const full = slotsFull(slots);
  const remaining = unplacedItems(tray, slots);

  function submit(next: (string | null)[]) {
    if (answered || submitting) return;
    onSubmit(slotAnswers(next, choices));
  }

  function handleFlagTap(itemId: string) {
    if (answered || submitting) return;
    const next = placeFlag(slots, itemId);
    if (next === slots) return;
    setSlots(next);
    if (slotsFull(next)) submit(next);
  }

  function handleSlotTap(itemId: string | null) {
    if (answered || submitting || itemId === null) return;
    setSlots(removeFlag(slots, itemId));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice, index) => {
          const placedId = slots[index];
          const placed = placedId ? itemById.get(placedId) : null;
          const result = placedId ? resultByItem.get(placedId) : undefined;
          const correctId = answered && result && !result.correct ? correctItemId(results, choice.id) : null;
          const correctItem = correctId ? itemById.get(correctId) : null;

          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered || submitting || placedId === null}
              onClick={() => handleSlotTap(placedId)}
              aria-label={placed ? `${SLOT_MARKS[index]} ${choice.label}。入れた国旗を戻す` : `${SLOT_MARKS[index]} ${choice.label}。国旗を入れる枠`}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 border-b-4 border-dashed bg-white p-3 text-center transition-colors disabled:pointer-events-none",
                placed ? "border-solid border-[#2b6fa3] bg-[#e6f1f9]" : "border-[#c9b98f]",
                answered && result?.correct && "border-solid border-[#3b7f26] bg-[#e5f4dc]",
                answered && result && !result.correct && "border-solid border-[#c9573b] bg-[#fde6de]",
              )}
            >
              {/* ふりがなの要素が別々のflexの子になって1文字ずつ折れないよう、ふつうの文として並べる */}
              <span className="block text-base leading-snug font-black text-[#3b3226]">
                <span aria-hidden>{SLOT_MARKS[index]} </span>
                <AutoFurigana text={choice.label} />
              </span>
              {placed ? (
                <Flag src={placed.image} className="w-24" />
              ) : (
                <span className="flex aspect-[3/2] w-24 items-center justify-center rounded-sm border-2 border-dashed border-[#c9b98f] text-xl text-[#c9b98f]" aria-hidden>
                  ？
                </span>
              )}
              {answered && result && (
                <span aria-hidden className="text-sm font-black">
                  {result.correct ? "✓" : "✕"}
                </span>
              )}
              {correctItem && (
                <span className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#6b5d45]">
                  <AutoFurigana text="正しい国旗" />
                  <Flag src={correctItem.image} className="w-16" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-bold text-[#6b5d45]">
            <AutoFurigana text="国旗をタップして、枠に入れよう" />
          </p>
          <div className="grid min-h-16 grid-cols-2 gap-3 sm:grid-cols-4">
            {remaining.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={submitting}
                onClick={() => handleFlagTap(item.id)}
                aria-label="国旗を枠に入れる"
                className="flex items-center justify-center rounded-xl border-2 border-b-4 border-[#e8dfcf] bg-white p-2 transition-transform active:translate-y-0.5 disabled:opacity-60"
              >
                <Flag src={item.image} className="w-24" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!answered && full && (
        <Button variant="primary" size="lg" disabled={submitting} onClick={() => submit(slots)}>
          答え合わせ
        </Button>
      )}
    </div>
  );
}
