import { BadgeImage } from "@/components/app/badge-image";

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
      className={`flex items-center gap-1.5 rounded-full bg-[#fffaf0] py-1 pr-3 pl-1.5 shadow-[0_2px_6px_rgba(59,50,38,0.15)] ${className ?? ""}`}
    >
      <BadgeImage badge="hp" size={20} />
      {/* スマホ幅ではヘッダーに収まらないため、バーを省いてハートと数値だけにする */}
      <div className="hidden h-2.5 w-24 overflow-hidden rounded-full bg-[#efe5cf] sm:block">
        <div
          className="h-full rounded-full bg-[#e5533f] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-black text-[#3b3226]">
        {value}/{max}
      </span>
    </div>
  );
}
