import { BadgeImage } from "@/components/app/badge-image";

/** 学習ポイント(正解でのみ貯まり、町のアイテムを買う通貨)の表示。課金コイン(PointsBadge)とは別物 */
export function LearnPointsBadge({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full bg-[#fffaf0] px-2.5 py-1 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
      title="学習ポイント"
    >
      <BadgeImage badge="points" size={20} />
      <span className="text-xs font-black text-[#2e6b1c]">
        {value.toLocaleString()}
        <span className="ml-0.5 text-[10px]">pt</span>
      </span>
    </div>
  );
}
