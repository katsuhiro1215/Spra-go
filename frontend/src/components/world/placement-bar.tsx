import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

export function PlacementBar({ item, onCancel }: { item: WorldItem; onCancel: () => void }) {
  return (
    <div className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-28px)] max-w-[452px] items-center gap-2.5 rounded-2xl bg-[#fffaf0] py-2 pr-2 pl-2.5 text-[#3b3226] shadow-[0_6px_16px_rgba(59,50,38,0.18)]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f5efe1]">
        <ItemIcon assetKey={item.asset_key} size={44} />
      </div>
      <p className="flex-1 text-[13.5px] leading-snug font-bold">
        <AutoFurigana text={`「${item.name}」を置く場所をタップしてね`} />
      </p>
      <button type="button" onClick={onCancel} className="h-11 rounded-xl bg-[#efe5cf] px-3.5 text-[13px] font-black">
        やめる
      </button>
    </div>
  );
}
