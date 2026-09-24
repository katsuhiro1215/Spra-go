"use client";

import { useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import { cn } from "@/lib/utils";

export type MatchingItem = { id: string; image: string };
export type MatchingChoice = { id: number; label: string };
export type MatchingResult = {
  item_id: string;
  correct: boolean;
  correct_choice_id: number;
};

type Props = {
  items: MatchingItem[];
  choices: MatchingChoice[];
  answered: boolean;
  results: MatchingResult[] | null;
  submitting: boolean;
  onSubmit: (answers: { item_id: string; choice_id: number }[]) => void;
};

// マッチング問題(タップ式): 国旗などのアイテムを1つタップして選択状態にし、
// 続けて国名などのラベルをタップするとペアが確定する。ドラッグ操作は
// スマホでの誤操作・実装コストが高いため採用せず、2ステップタップで代替する。
export function MatchingQuestion({
  items,
  choices,
  answered,
  results,
  submitting,
  onSubmit,
}: Props) {
  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    () => Object.fromEntries(items.map((item) => [item.id, null])),
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const resultByItemId = new Map(
    (results ?? []).map((result) => [result.item_id, result]),
  );
  const usedChoiceIds = new Set(Object.values(assignments).filter((v) => v !== null));
  const allAssigned = Object.values(assignments).every((v) => v !== null);

  function handleItemTap(itemId: string) {
    if (answered) return;
    setActiveItemId((prev) => (prev === itemId ? null : itemId));
  }

  function handleChoiceTap(choiceId: number) {
    if (answered || !activeItemId) return;

    setAssignments((prev) => {
      const next = { ...prev };
      // 同じラベルを他のアイテムに使っていた場合は付け替える(1対1のため)
      for (const key of Object.keys(next)) {
        if (next[key] === choiceId) next[key] = null;
      }
      next[activeItemId] = choiceId;
      return next;
    });

    const nextUnassignedItem = items.find(
      (item) => item.id !== activeItemId && assignments[item.id] === null,
    );
    setActiveItemId(nextUnassignedItem?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const assignedChoiceId = assignments[item.id];
          const assignedLabel = choices.find((c) => c.id === assignedChoiceId)?.label;
          const result = resultByItemId.get(item.id);

          return (
            <button
              key={item.id}
              type="button"
              disabled={answered}
              onClick={() => handleItemTap(item.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 border-b-4 bg-white p-3 transition-colors disabled:pointer-events-none",
                activeItemId === item.id
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200",
                answered && result?.correct && "border-green-500 bg-green-50",
                answered && result && !result.correct && "border-rose-500 bg-rose-50",
              )}
            >
              <div className="relative h-14 w-20 overflow-hidden rounded-sm border border-border">
                <Image src={item.image} alt="" fill className="object-cover" />
              </div>
              <span className="min-h-5 text-xs font-medium text-slate-600">
                {assignedLabel ? <AutoFurigana text={assignedLabel} /> : "？"}
              </span>
              {answered && result && (
                <span aria-hidden className="text-sm">
                  {result.correct ? "✓" : "✕"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => {
          const isUsed = usedChoiceIds.has(choice.id);

          return (
            <Button
              key={choice.id}
              type="button"
              variant={isUsed ? "locked" : "default"}
              disabled={answered || !activeItemId}
              onClick={() => handleChoiceTap(choice.id)}
              className="h-auto min-h-12 w-full items-center justify-center py-3 text-center leading-snug whitespace-normal normal-case"
            >
              <AutoFurigana text={choice.label} />
            </Button>
          );
        })}
      </div>

      {!answered && (
        <Button
          variant="primary"
          size="lg"
          disabled={!allAssigned || submitting}
          onClick={() =>
            onSubmit(
              Object.entries(assignments).map(([item_id, choice_id]) => ({
                item_id,
                choice_id: choice_id as number,
              })),
            )
          }
        >
          答え合わせ
        </Button>
      )}
    </div>
  );
}
