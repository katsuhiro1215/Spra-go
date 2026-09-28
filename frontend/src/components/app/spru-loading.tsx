"use client";

import { SkyPage, SkyText } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";

/** 「読み込み中...」。歩くスプルがゆっくり上下する(動きを減らす設定では止まる)。SkyPage の中に置く */
export function SpruLoading({ className }: { className?: string }) {
  return (
    <div role="status" className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <SpruFigure image="walk" standHeight={80} className="animate-character-bounce" eager />
      <SkyText muted className="text-sm">
        読み込み中...
      </SkyText>
    </div>
  );
}

/** 画面全体の「読み込み中...」。時間帯の空の上に SpruLoading を出す */
export function LoadingScreen() {
  return (
    <SkyPage className="items-center justify-center">
      <SpruLoading />
    </SkyPage>
  );
}
