import { Sprout } from "lucide-react";

/** 学習ポイント(正解でのみ貯まり、町のアイテムを買う通貨)の表示。課金コイン(PointsBadge)とは別物 */
export function LearnPointsBadge({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-600/25 px-2.5 py-1 backdrop-blur-sm ${className ?? ""}`}
      title="学習ポイント"
    >
      <Sprout className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      <span className="text-xs font-bold text-white drop-shadow">
        {value.toLocaleString()}
        <span className="ml-0.5 text-[10px]">pt</span>
      </span>
    </div>
  );
}
