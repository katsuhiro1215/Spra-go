"use client";

import { useEffect } from "react";

import { OutingImage } from "@/components/spru/outing-image";
import { prefersReducedMotion } from "@/lib/motion";

// globals.css の outing-run-across・outing-walk-away と同じ長さ
const OUTING_MS = 1_000;

/** 家族の町へのお出かけ。行くときは走って横切り、もどるときは後ろ姿で小さくなる(設計書5-5)。onDone は useCallback で固定して渡す */
export function OutingScene({ kind, onDone }: { kind: "depart" | "home"; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, prefersReducedMotion() ? 0 : OUTING_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <button
      type="button"
      aria-label="とばす"
      onClick={onDone}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#8fd4e9]"
    >
      {kind === "depart" ? (
        <OutingImage image="run" height={140} className="animate-outing-run-across" />
      ) : (
        <OutingImage image="back" height={140} className="animate-outing-walk-away" />
      )}
    </button>
  );
}
