import { BadgeImage } from "@/components/app/badge-image";

/**
 * ポイント表示のUI。正解でポイント獲得しアイテム購入に使う仕組みは今後実装。
 */
export function PointsBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full bg-[#fffaf0] px-3 py-1 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
    >
      <BadgeImage badge="coins" size={20} />
      <span className="text-xs font-black text-[#3b3226]">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
