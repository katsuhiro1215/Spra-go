import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

/** 置く場所を選ぶ間の案内。2×2の建物は、下見してから［ここに建てる］で決める(設計書5-3) */
export function PlacementBar({
  item,
  previewing,
  hint,
  onConfirm,
  onCancel,
}: {
  item: WorldItem;
  previewing: boolean;
  hint: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const text = previewing
    ? "ここに建てる？"
    : item.footprint > 1
      ? `「${item.name}」を建てる場所をタップしてね`
      : `「${item.name}」を置く場所をタップしてね`;
  return (
    <div className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-28px)] max-w-[452px] items-center gap-2.5 rounded-2xl bg-[#fffaf0] py-2 pr-2 pl-2.5 text-[#3b3226] shadow-[0_6px_16px_rgba(59,50,38,0.18)]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f5efe1]">
        <ItemIcon assetKey={item.asset_key} size={44} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug font-bold">
          <AutoFurigana text={text} />
        </p>
        {hint && (
          <p className="text-[11px] leading-snug font-bold text-[#6b5d45]">
            <AutoFurigana text={hint} />
          </p>
        )}
      </div>
      {previewing && (
        <button type="button" onClick={onConfirm} className="h-11 shrink-0 rounded-xl bg-[#3b7f26] px-3 text-[13px] font-black text-white">
          <AutoFurigana text="ここに建てる" />
        </button>
      )}
      <button type="button" onClick={onCancel} className="h-11 shrink-0 rounded-xl bg-[#efe5cf] px-3.5 text-[13px] font-black">
        やめる
      </button>
    </div>
  );
}
