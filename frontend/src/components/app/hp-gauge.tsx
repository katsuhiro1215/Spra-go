import { Heart } from "lucide-react";

/**
 * 体力ゲージのUI。減少・回復のロジックは未実装で、表示のみ。
 */
export function HpGauge({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-white/30 bg-black/20 py-1 pr-3 pl-1.5 backdrop-blur-sm ${className ?? ""}`}
    >
      <Heart className="h-4 w-4 shrink-0 fill-rose-500 text-rose-500" />
      <div className="h-2.5 w-16 overflow-hidden rounded-full bg-white/20 sm:w-24">
        <div
          className="h-full rounded-full bg-linear-to-r from-rose-500 to-rose-400 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-white drop-shadow">
        {value}/{max}
      </span>
    </div>
  );
}
