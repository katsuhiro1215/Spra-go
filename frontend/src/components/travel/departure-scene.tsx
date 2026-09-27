"use client";

import { useEffect, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { OutingImage } from "@/components/spru/outing-image";
import { ItemArt } from "@/components/world/item-art";

import { departurePhase, departureStart, type DeparturePhase } from "./travel";
import type { Destination } from "./types";

/** 初めての国へ出発する場面(設計書5-2)。reduced は操作のときに調べて渡し、onDone は useCallback で固定して渡す */
export function DepartureScene({ destination, reduced, onDone }: { destination: Destination; reduced: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<DeparturePhase>(() => departurePhase(departureStart(reduced)));

  useEffect(() => {
    const start = Date.now() - departureStart(reduced);
    const timer = setInterval(() => {
      const next = departurePhase(Date.now() - start);
      if (next === "done") {
        clearInterval(timer);
        onDone();
        return;
      }
      setPhase(next);
    }, 100);
    return () => clearInterval(timer);
  }, [reduced, onDone]);

  const caption =
    phase === "walk" ? "桟橋から出発！" : phase === "sail" ? `${destination.name}へ船で向かっているよ` : `${destination.name}に着いた！`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${destination.name}へ出発`}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#bfe8f7] to-[#4fa9d8]"
    >
      <button
        type="button"
        onClick={onDone}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/85 px-4 py-2 text-sm font-black text-[#2b5d7a] shadow"
      >
        とばす
      </button>
      <p aria-live="polite" className="sr-only">
        {caption}
      </p>

      {phase === "walk" && (
        <div className="flex flex-col items-center">
          <OutingImage image="back" height={150} className="animate-outing-walk-away" />
          <svg viewBox="0 0 200 40" width={220} aria-hidden>
            <path d="M40 30 L160 10" stroke="#8a5a33" strokeWidth={14} strokeLinecap="round" />
            <path d="M40 30 L160 10" stroke="#c9905a" strokeWidth={6} strokeDasharray="6 5" />
          </svg>
        </div>
      )}

      {phase === "sail" && (
        <div className="relative flex h-40 w-full items-center">
          <svg viewBox="-40 -60 80 70" width={160} aria-hidden className="animate-boat-sail absolute left-1/2 -ml-20">
            <ItemArt assetKey="boat_small" />
          </svg>
          <svg viewBox="0 0 400 20" className="absolute bottom-6 w-full" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 10 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0"
              stroke="#ffffff"
              strokeWidth={3}
              fill="none"
              opacity={0.7}
            />
          </svg>
        </div>
      )}

      {phase === "arrive" && (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <OutingImage image="run" height={160} className="animate-outing-run-in" />
          <h2 className="text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            <AutoFurigana text={`${destination.name}に着いた！`} />
          </h2>
          <p className="rounded-full bg-white/85 px-4 py-1.5 text-base font-black text-[#2b5d7a]">
            {destination.greeting.text}
            <span className="ml-2 text-xs text-[#6b5d45]">({destination.greeting.reading})</span>
          </p>
        </div>
      )}
    </div>
  );
}
