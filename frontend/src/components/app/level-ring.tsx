"use client";

import { levelLabel, ringFraction, ringOffset, type LevelXp } from "@/lib/level-ring";

const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ヘッダーのレベルの輪(docs/design/2026-10-07-header-level-design.md 5-1章)。中にレベルの数字。
 * XPがたまると、輪が12時の位置から時計回りに伸びる。押すと「じぶんの状態」を開く(onClick)。
 * 動きを減らす設定のときは、伸びの動きをなくす
 */
export function LevelRing({
  level,
  xp,
  range,
  onClick,
}: {
  level: number;
  xp: number;
  range: LevelXp | undefined;
  onClick?: () => void;
}) {
  const fraction = ringFraction(xp, range);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${levelLabel(level, range, xp)}。じぶんの状態を開く`}
      className="relative flex shrink-0 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)] focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:outline-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#efe5cf" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#3b7f26"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={ringOffset(CIRCUMFERENCE, fraction)}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className={`relative font-black text-[#3b3226] ${level >= 100 ? "text-[11px]" : level >= 10 ? "text-sm" : "text-base"}`}>{level}</span>
    </button>
  );
}
