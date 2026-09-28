import { BadgeImage } from "@/components/app/badge-image";

/**
 * 体力ゲージ(設計書4-1)。バーはスマホでもいつも出し、親から渡す幅(className)いっぱいに伸ばす
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
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#efe5cf]">
        <div
          className="h-full rounded-full bg-[#e5533f] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-black text-[#3b3226]">
        {value}/{max}
      </span>
    </div>
  );
}
