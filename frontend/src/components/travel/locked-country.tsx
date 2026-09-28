"use client";

import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Panel } from "@/components/app/panel";
import { SkyPage } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";

import { lockedCountryText } from "./travel";

const GO_WORLD_CLASS =
  "flex h-12 items-center justify-center rounded-2xl bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_4px_0_#285a19]";

/** 鍵の国の画面を直接開いたとき(APIが403を返したとき)の案内(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-6) */
export function LockedCountry() {
  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 pb-28">
        <SpruFigure image="think" standHeight={110} alt="スプル" eager />
        <Panel className="flex w-full flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-black text-[#3b3226]">
            <AutoFurigana text="まだこの国に着いていません" />
          </p>
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="『せかい』でチケットを使うと行けるよ" />
          </p>
          <Link href="/trip" className={GO_WORLD_CLASS}>
            せかいへ
          </Link>
        </Panel>
      </main>
      <BottomNav />
    </SkyPage>
  );
}

/** 学ぶタブで鍵の国を押したときに下から出るカード(設計書5-5) */
export function LockedCountrySheet({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-country-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-center text-[#3b3226]"
      >
        <h2 id="locked-country-title" className="text-lg font-black">
          <AutoFurigana text={`${name}はまだの国`} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={lockedCountryText(name)} />
        </p>
        <Link href="/trip" className={GO_WORLD_CLASS}>
          せかいへ
        </Link>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[#6b5d45] underline underline-offset-2">
          とじる
        </button>
      </div>
    </div>
  );
}
