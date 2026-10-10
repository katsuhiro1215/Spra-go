"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";

import type { SpaceMapState, SpaceStop } from "./space-map-api";
import { starsLine, stopLook, stopsForDisplay, type StopLook } from "./space-map-view";

const LOOK_CLASS: Record<StopLook, string> = {
  locked: "opacity-40 grayscale",
  open: "",
  current: "ring-4 ring-[#f2b632] animate-pulse",
  cleared: "ring-2 ring-white/70",
};

/** 宇宙ぼうけんマップ(docs/design/2026-10-10-space-adventure-map-design.md 1・3-2)。星を、下(月)から上へ順にたどる */
export function SpaceMap({
  map,
  starting,
  error,
  onStart,
  onPractice,
}: {
  map: SpaceMapState;
  starting: boolean;
  error: string | null;
  onStart: (stop: SpaceStop) => void;
  onPractice: () => void;
}) {
  const [selected, setSelected] = useState<string>(map.current);
  const chosen = map.stops.find((stop) => stop.key === selected) ?? map.stops[0];
  const stops = stopsForDisplay(map);

  // 開いたとき、いま向かう星が見える位置まで動かす(星の地図は縦に長い)
  const current = map.current;
  useEffect(() => {
    document.getElementById(`stop-${current}`)?.scrollIntoView({ block: "center" });
  }, [current]);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-8 pb-28 text-center">
      <SkyTitle className="text-2xl">
        <AutoFurigana text="うちゅうぼうけん" />
      </SkyTitle>
      <SkyText className="text-sm">
        <AutoFurigana text="星を クリアして、つぎの星へ すすもう" />
      </SkyText>

      <ol aria-label="星の地図" className="relative flex w-full flex-col items-stretch gap-5 py-2">
        <span aria-hidden className="absolute top-4 bottom-4 left-1/2 w-0 -translate-x-1/2 border-l-4 border-dotted border-white/35" />
        {stops.map((stop, index) => {
          const look = stopLook(stop, map.current);
          return (
            <li key={stop.key} id={`stop-${stop.key}`} className={`relative flex ${index % 2 === 0 ? "justify-start pl-6" : "justify-end pr-6"}`}>
              <button
                type="button"
                disabled={!stop.open}
                aria-label={`${stop.name}${stop.open ? "" : "（まだ行けない）"}`}
                aria-pressed={selected === stop.key}
                onClick={() => setSelected(stop.key)}
                className="flex flex-col items-center gap-1 focus-visible:outline-none"
              >
                <span
                  className={`flex size-16 items-center justify-center rounded-full text-sm font-black text-[#2b2540] shadow-[0_6px_16px_rgba(0,0,0,0.35)] ${LOOK_CLASS[look]} ${selected === stop.key ? "scale-110" : ""}`}
                  style={{ backgroundColor: stop.color }}
                >
                  {stop.open ? stop.name : "🔒"}
                </span>
                <SkyText as="span" className="text-xs">
                  {stop.open ? starsLine(stop.stars) : "？"}
                </SkyText>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex w-full flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-[0_8px_22px_rgba(0,0,0,0.25)]">
        <p className="text-lg font-black">
          <AutoFurigana text={chosen.name} />　<span className="text-base">{starsLine(chosen.stars)}</span>
        </p>
        <p className="text-sm font-bold">
          <AutoFurigana text={chosen.note} />
        </p>
        <p className="text-xs text-[#6b5d45]">
          <AutoFurigana text={`${chosen.difficulty}の問題 ／ 6わり以上 せいかいで クリア`} />
        </p>
        <AppButton variant="warning" size="lg" disabled={!chosen.open || starting} onClick={() => onStart(chosen)} className="w-full">
          <AutoFurigana text={chosen.open ? "出発！" : "まだ行けないよ"} />
        </AppButton>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-[#c9573b]">
          <AutoFurigana text={error} />
        </p>
      )}

      <div className="flex w-full gap-3">
        <Link href="/space/cards" className="flex-1">
          <AppButton variant="secondary" className="w-full">
            <AutoFurigana text="うちゅうずかん" />
          </AppButton>
        </Link>
        <AppButton variant="default" className="flex-1" onClick={onPractice}>
          <AutoFurigana text="れんしゅう" />
        </AppButton>
      </div>
      <SpruFigure image="cheer" standHeight={70} alt="スプル" />
    </div>
  );
}
