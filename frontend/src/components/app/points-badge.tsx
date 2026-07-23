import { Coins } from "lucide-react";

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
      className={`flex items-center gap-1.5 rounded-full border border-white/30 bg-black/20 px-3 py-1 backdrop-blur-sm ${className ?? ""}`}
    >
      <Coins className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="text-xs font-medium text-white drop-shadow">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
