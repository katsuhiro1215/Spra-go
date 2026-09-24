"use client";

import { useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import { cn } from "@/lib/utils";

export type SortingItem = { id: string; image: string };
export type SortingBasket = { id: string; label: string };

type Props = {
  items: SortingItem[];
  baskets: SortingBasket[];
  answered: boolean;
  submitting: boolean;
  onSubmit: (assignments: { item_id: string; basket_id: string }[]) => void;
};

// 仕分け(カゴ分け)問題(タップ式): アイテムを1つタップして選択状態にし、
// 続けてカゴをタップすると割り当てが確定する。マッチングと違い1つのカゴに
// 複数アイテムが入りうる(1対1ではなく多対1)。
export function SortingQuestion({
  items,
  baskets,
  answered,
  submitting,
  onSubmit,
}: Props) {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    () => Object.fromEntries(items.map((item) => [item.id, null])),
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const allAssigned = Object.values(assignments).every((v) => v !== null);

  function handleItemTap(itemId: string) {
    if (answered) return;
    setActiveItemId((prev) => (prev === itemId ? null : itemId));
  }

  function handleBasketTap(basketId: string) {
    if (answered || !activeItemId) return;

    setAssignments((prev) => ({ ...prev, [activeItemId]: basketId }));

    const nextUnassignedItem = items.find(
      (item) => item.id !== activeItemId && assignments[item.id] === null,
    );
    setActiveItemId(nextUnassignedItem?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((item) => {
          const basketLabel = baskets.find(
            (b) => b.id === assignments[item.id],
          )?.label;

          return (
            <button
              key={item.id}
              type="button"
              disabled={answered}
              onClick={() => handleItemTap(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 border-b-4 bg-white p-2 transition-colors disabled:pointer-events-none",
                activeItemId === item.id
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200",
              )}
            >
              <div className="relative h-12 w-16 overflow-hidden rounded-sm border border-border">
                <Image src={item.image} alt="" fill className="object-cover" />
              </div>
              <span className="min-h-4 text-[10px] font-medium text-slate-600">
                {basketLabel ?? "？"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {baskets.map((basket) => (
          <Button
            key={basket.id}
            type="button"
            variant="default"
            disabled={answered || !activeItemId}
            onClick={() => handleBasketTap(basket.id)}
            className="h-auto min-h-12 w-full items-center justify-center py-3 text-center leading-snug whitespace-normal normal-case"
          >
            <AutoFurigana text={basket.label} />
          </Button>
        ))}
      </div>

      {!answered && (
        <Button
          variant="primary"
          size="lg"
          disabled={!allAssigned || submitting}
          onClick={() =>
            onSubmit(
              Object.entries(assignments).map(([item_id, basket_id]) => ({
                item_id,
                basket_id: basket_id as string,
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
