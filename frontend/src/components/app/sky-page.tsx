"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { TIME_THEME } from "@/components/world/ambience";
import { getTimeOfDay, type TimeOfDay } from "@/components/world/time-of-day";

import { skyTextClass } from "./palette";

const SkyTimeContext = createContext<TimeOfDay>("day");

/** SkyPage の中で、今の時間帯を知る(空の上の文字の色に使う) */
export function useSkyTime(): TimeOfDay {
  return useContext(SkyTimeContext);
}

/**
 * 町以外の画面のいちばん外側。町と同じ時間帯の空を背景にする(設計書4章)。
 * サーバーとブラウザで時刻がずれて表示が崩れないよう、最初は昼の色で描き、開いたあとに端末の時計で決める
 */
export function SkyPage({ children, className }: { children: ReactNode; className?: string }) {
  const [time, setTime] = useState<TimeOfDay>("day");

  useEffect(() => {
    const update = () => setTime(getTimeOfDay(new Date()));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <SkyTimeContext.Provider value={time}>
      <div
        className={`relative flex min-h-screen flex-col overflow-hidden transition-[background] duration-700 ${className ?? ""}`}
        style={{ background: TIME_THEME[time].background }}
      >
        {children}
      </div>
    </SkyTimeContext.Provider>
  );
}

/** 空の上に直接置く見出し。朝・昼・夕方はこげ茶、夜は白 */
export function SkyTitle({
  children,
  className,
  as: Tag = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  const time = useSkyTime();
  return <Tag className={`font-black ${skyTextClass(time, "title")} ${className ?? ""}`}>{children}</Tag>;
}

/** 空の上に直接置く文字(補足・「読み込み中...」など)。muted は少し薄い色 */
export function SkyText({
  children,
  className,
  muted = false,
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  as?: "p" | "span" | "div";
}) {
  const time = useSkyTime();
  return <Tag className={`font-bold ${skyTextClass(time, muted ? "muted" : "text")} ${className ?? ""}`}>{children}</Tag>;
}
