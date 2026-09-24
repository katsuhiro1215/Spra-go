"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import { cn } from "@/lib/utils";

export type OrderingChoice = { id: number; label: string };

type Props = {
  choices: OrderingChoice[];
  answered: boolean;
  submitting: boolean;
  onSubmit: (answerOrder: number[]) => void;
};

// 並べ替え問題(タップ式): 選択肢を正しいと思う順にタップしていく。
// ドラッグ操作はスマホでの誤操作・実装コストが高いため採用しない。
// タップした選択肢には順番バッジが付き、もう一度タップすると選択解除できる。
export function OrderingQuestion({
  choices,
  answered,
  submitting,
  onSubmit,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);

  const allSelected = selectedOrder.length === choices.length;

  function handleTap(choiceId: number) {
    if (answered) return;

    setSelectedOrder((prev) => {
      if (prev.includes(choiceId)) {
        return prev.filter((id) => id !== choiceId);
      }
      if (prev.length >= choices.length) return prev;
      return [...prev, choiceId];
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const position = selectedOrder.indexOf(choice.id);
          const isSelected = position !== -1;

          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered}
              onClick={() => handleTap(choice.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 border-b-4 bg-white p-3 text-left transition-colors disabled:pointer-events-none",
                isSelected ? "border-sky-400 bg-sky-50" : "border-slate-200",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  isSelected
                    ? "bg-sky-400 text-white"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {isSelected ? position + 1 : ""}
              </span>
              <span className="text-sm font-medium text-slate-700">
                <AutoFurigana text={choice.label} />
              </span>
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="flex gap-3">
          <Button
            variant="ghost"
            disabled={selectedOrder.length === 0}
            onClick={() => setSelectedOrder([])}
          >
            やり直す
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!allSelected || submitting}
            onClick={() => onSubmit(selectedOrder)}
          >
            答え合わせ
          </Button>
        </div>
      )}
    </div>
  );
}
