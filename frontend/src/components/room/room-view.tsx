"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { prefersReducedMotion } from "@/lib/motion";

import { ROOM_ASSETS } from "./room-assets";
import { ROOM_VIEW, ROOM_WINDOW, roomItems, type RoomItem } from "./room-layout";
import { roomLine, roomMode, roomSpruPose } from "./room-state";

const BUBBLE_MS = 2400;

// 元の絵の座標を、見せる範囲に対する割合(%)にする
const pct = (value: number, origin: number, size: number) => ((value - origin) / size) * 100;
const boxStyle = (item: Pick<RoomItem, "left" | "top" | "width" | "height">) => ({
  left: `${pct(item.left, ROOM_VIEW.x, ROOM_VIEW.width)}%`,
  top: `${pct(item.top, ROOM_VIEW.y, ROOM_VIEW.height)}%`,
  width: `${(item.width / ROOM_VIEW.width) * 100}%`,
  height: `${(item.height / ROOM_VIEW.height) * 100}%`,
});

/**
 * スプルの家の中(見るだけの部屋。設計書 2026-10-05-spru-room)。
 * 昼・夜は、町のスプルが寝ているか(sleeping)で決める。寝ているスプルをタップすると、onWake で起こす(町と同じ処理)
 */
export function RoomView({ sleeping, onWake, onClose }: { sleeping: boolean; onWake: () => void; onClose: () => void }) {
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [lastTapAt, setLastTapAt] = useState<number | null>(null);
  const [taps, setTaps] = useState(0);
  const [bubble, setBubble] = useState<{ text: string; until: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const mode = roomMode(sleeping);
  const pose = roomSpruPose({ openedAt, lastTapAt }, now);
  const items = roomItems(mode, pose);
  // タップできるのは、昼は立って(座って)いるスプル、夜はベッドで眠るスプル
  const target = items.find((item) => item.key.startsWith("spru_") || item.key === "bed_sleeping");
  const hopping = pose === "wave" && !prefersReducedMotion();

  function tap() {
    const at = Date.now();
    if (sleeping) {
      onWake();
      setBubble({ text: "ふぁ…", until: at + BUBBLE_MS });
      setLastTapAt(at);
      return;
    }
    setLastTapAt(at);
    setBubble({ text: roomLine("day", taps), until: at + BUBBLE_MS });
    setTaps(taps + 1);
  }

  const shownBubble = bubble && bubble.until > now ? bubble.text : null;
  const bubbleAt = target && {
    left: pct(target.left + target.width / 2, ROOM_VIEW.x, ROOM_VIEW.width),
    top: pct(target.top, ROOM_VIEW.y, ROOM_VIEW.height),
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.6)] px-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="スプルの家の中"
        className="flex w-full max-w-[480px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-3 pt-4 pb-4 text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-[#efe5cf]"
          style={{
            aspectRatio: `${ROOM_VIEW.width} / ${ROOM_VIEW.height}`,
            filter: mode === "night" ? "brightness(0.8) saturate(0.9)" : undefined,
          }}
        >
          {items.map((item) => {
            const asset = ROOM_ASSETS[item.key];
            const isSpru = item.key.startsWith("spru_");
            return (
              <div key={item.key} className="pointer-events-none absolute" style={boxStyle(item)}>
                <Image
                  src={asset.src}
                  alt=""
                  width={asset.outWidth}
                  height={asset.outHeight}
                  className={`h-full w-full max-w-none ${isSpru && hopping ? "animate-spru-hop" : ""}`}
                  draggable={false}
                  unoptimized
                />
              </div>
            );
          })}
          {mode === "night" && (
            // 窓のあたたかい光(夜だけ)
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${pct(ROOM_WINDOW.cx - ROOM_WINDOW.r, ROOM_VIEW.x, ROOM_VIEW.width)}%`,
                top: `${pct(ROOM_WINDOW.cy - ROOM_WINDOW.r, ROOM_VIEW.y, ROOM_VIEW.height)}%`,
                width: `${((ROOM_WINDOW.r * 2) / ROOM_VIEW.width) * 100}%`,
                height: `${((ROOM_WINDOW.r * 2) / ROOM_VIEW.height) * 100}%`,
                background: "radial-gradient(circle, rgba(255,214,120,0.55) 0%, rgba(255,214,120,0) 70%)",
              }}
            />
          )}
          {target && (
            <button
              type="button"
              aria-label={sleeping ? "ねているスプル(おこす)" : "スプル"}
              onClick={tap}
              className="absolute rounded-xl focus-visible:outline-3 focus-visible:outline-[#f2b632]"
              style={boxStyle(target)}
            />
          )}
          {shownBubble && bubbleAt && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[70%] -translate-x-1/2 -translate-y-full rounded-2xl bg-white px-3 py-1.5 text-[13px] leading-snug font-bold shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
              style={{ left: `${bubbleAt.left}%`, top: `${bubbleAt.top}%` }}
              aria-live="polite"
            >
              <AutoFurigana text={shownBubble} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          <AutoFurigana text="もどる" />
        </button>
      </div>
    </div>
  );
}
