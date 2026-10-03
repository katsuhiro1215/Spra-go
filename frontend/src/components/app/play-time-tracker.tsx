"use client";

import { useEffect, useRef } from "react";

import { useProfile } from "@/components/app/profile-provider";
import { apiFetch } from "@/lib/api";
import { BEAT_SECONDS, shouldSendBeat } from "@/lib/play-time";

/**
 * 遊んだ時間を送る(docs/design/2026-10-03-analytics-design.md 5-2)。プレイヤーを選んでいて、画面が見えていて、
 * 直近60秒以内に操作があるときだけ、30秒ごとに送る。どの画面かは送らない。送れなくても、何も言わない
 */
export function PlayTimeTracker() {
  const { profile } = useProfile();
  const hasProfile = profile !== null;
  const lastActivityAt = useRef(0);

  useEffect(() => {
    if (!hasProfile) return;

    lastActivityAt.current = Date.now();
    const touch = () => {
      lastActivityAt.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));

    const timer = window.setInterval(() => {
      const send = shouldSendBeat({
        hasProfile: true,
        visible: document.visibilityState === "visible",
        lastActivityAt: lastActivityAt.current,
        now: Date.now(),
      });
      if (send) apiFetch("/api/play-time", { method: "POST", body: JSON.stringify({ seconds: BEAT_SECONDS }) }).catch(() => {});
    }, BEAT_SECONDS * 1000);

    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, touch));
    };
  }, [hasProfile]);

  return null;
}
