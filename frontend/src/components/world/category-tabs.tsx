"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { cn } from "@/lib/utils";

type Props<T extends string> = {
  /** タブと中身をつなぐidのもと(1画面に1つ)。タブは `${idBase}-tab-${tab}`、中身は `${idBase}-panel` */
  idBase: string;
  /** タブの並び全体の名前(読み上げ用) */
  label: string;
  tabs: readonly T[];
  selected: T;
  onSelect: (tab: T) => void;
  tabLabel: (tab: T) => string;
  /** 小さな点を付けるタブ(NEW の物があるタブ) */
  marked?: readonly T[];
};

/** ショップとバッグのカテゴリのタブ(設計書 2026-09-28-town-items 3-3)。どのタブもボタンで、Tabキーで移り Enter・Space で切り替える */
export function CategoryTabs<T extends string>({ idBase, label, tabs, selected, onSelect, tabLabel, marked = [] }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
      {tabs.map((tab) => {
        const active = tab === selected;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel`}
            onClick={() => onSelect(tab)}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-black whitespace-nowrap shadow",
              active ? "bg-[#3b7f26] text-white" : "bg-[#fffaf0] text-[#3b3226]",
            )}
          >
            <span>
              <AutoFurigana text={tabLabel(tab)} />
            </span>
            {marked.includes(tab) && (
              <>
                <span aria-hidden className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#d8352a]" />
                <span className="sr-only"><AutoFurigana text="(新しい物があります)" /></span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
