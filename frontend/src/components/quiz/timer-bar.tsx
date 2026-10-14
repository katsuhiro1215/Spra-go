import { NUMBER_SECONDS, timerTone, type TimerTone } from "@/lib/stage-timer";

const TONE_CLASS: Record<TimerTone, string> = {
  ok: "bg-[#5bb33e]",
  warn: "bg-[#f0a02c]",
  danger: "bg-[#d9482b]",
};

/** 1問の残り時間のバー。残り10秒から数字も出す。動きを減らす設定のときは、バーの動きなし(CSSの motion-reduce) */
export function TimerBar({ left, total }: { left: number; total: number }) {
  const tone = timerTone(left, total);
  const showNumber = left <= NUMBER_SECONDS;
  return (
    <div className="flex items-center gap-2" role="timer" aria-label={`のこり ${left}びょう`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#efe5cf]">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear motion-reduce:transition-none ${TONE_CLASS[tone]}`}
          style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }}
        />
      </div>
      <span className={`w-8 text-right text-sm font-black ${showNumber ? (tone === "danger" ? "text-[#d9482b]" : "text-[#6b5d45]") : "invisible"}`}>
        {left}
      </span>
    </div>
  );
}
