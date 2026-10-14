"use client";

import { useEffect, useRef, useState } from "react";

import { advanceElapsed, secondsLeft } from "@/lib/stage-timer";

const TICK_MS = 200;

/**
 * 1問の制限時間を数える。running が true の間だけ進み、画面が裏に回っている間は止まる。
 * resetKey が変わる(次の問題になる)と、0からやり直す。時間が切れたら onExpire を、その問題で1回だけ呼ぶ。
 * seconds が null のときは計らない(残りも null)
 */
export function useQuestionTimer({
  seconds,
  running,
  resetKey,
  onExpire,
}: {
  seconds: number | null;
  running: boolean;
  resetKey: string;
  onExpire: () => void;
}): number | null {
  const [tick, setTick] = useState<{ key: string; ms: number }>({ key: resetKey, ms: 0 });
  const expiredKey = useRef<string | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (seconds === null || !running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      const visible = document.visibilityState !== "hidden";
      setTick((prev) => ({
        key: resetKey,
        ms: advanceElapsed(prev.key === resetKey ? prev.ms : 0, delta, visible),
      }));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [seconds, running, resetKey]);

  const elapsed = tick.key === resetKey ? tick.ms : 0;
  const left = seconds === null ? null : secondsLeft(seconds, elapsed);

  useEffect(() => {
    if (left === 0 && running && expiredKey.current !== resetKey) {
      expiredKey.current = resetKey;
      onExpireRef.current();
    }
  }, [left, running, resetKey]);

  return left;
}
