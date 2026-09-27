"use client";

import { useEffect } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CostumeImage } from "@/components/spru/outing-image";

import type { SeasonGreeting } from "./season-greeting";

// globals.css の season-card と同じ長さ
const SHOW_MS = 3_000;

/** 期間中に町を開いたときの、衣装のスプルのあいさつ(設計書5-4)。onDone は useCallback で固定して渡す */
export function SeasonGreetingCard({ greeting, onDone }: { greeting: SeasonGreeting; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4" role="status">
      <button
        type="button"
        onClick={onDone}
        className="animate-season-card pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-2xl bg-[#fffaf0] p-3 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(0,0,0,0.2)]"
      >
        <CostumeImage costume={greeting.costume} height={84} className="shrink-0" />
        <span className="text-sm leading-relaxed font-black">
          <AutoFurigana text={greeting.line} />
        </span>
      </button>
    </div>
  );
}
