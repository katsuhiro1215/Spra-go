import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

export function ItemActionSheet({
  item,
  onMove,
  onPutAway,
  onClose,
}: {
  item: WorldItem;
  onMove: () => void;
  onPutAway: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-action-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-[#f5efe1]">
            <ItemIcon assetKey={item.asset_key} size={56} />
          </div>
          <h2 id="item-action-title" className="text-lg font-black">
            {item.name}
          </h2>
        </div>
        <button type="button" onClick={onMove} className="h-12 rounded-2xl bg-[#3b7f26] text-base font-black text-white">
          <AutoFurigana text="動かす" />
        </button>
        <button type="button" onClick={onPutAway} className="h-12 rounded-2xl bg-[#efe5cf] text-base font-black">
          <AutoFurigana text="バッグにしまう" />
        </button>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
