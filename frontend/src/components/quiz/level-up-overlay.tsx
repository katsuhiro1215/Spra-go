"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_SCENES } from "@/components/spru/spru-assets";
import { ItemIcon } from "@/components/world/item-art";
import type { ShopListItem } from "@/components/world/types";

/** レベルアップの全画面演出(設計書6-1)。クイズの途中なのでショップへは飛ばさず、次の目標として見せるだけ */
export function LevelUpOverlay({
  level,
  unlocked,
  onContinue,
}: {
  level: number;
  unlocked: ShopListItem[];
  onContinue: () => void;
}) {
  const scene = SPRU_SCENES.grow;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <Image
          src={scene.src}
          alt="成長するスプル"
          width={200}
          height={Math.round((200 * scene.height) / scene.width)}
          className="rounded-2xl"
        />
        <h2 id="level-up-title" className="text-2xl font-black text-[#2e6b1c]">
          レベルアップ！ Lv.{level}
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text="HPが全回復したよ" />
        </p>
        {unlocked.length > 0 && (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-[#f5efe1] p-3">
            {unlocked.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-left">
                <ItemIcon assetKey={item.asset_key} size={44} />
                <span className="text-sm font-black">
                  <AutoFurigana text={`${item.name}が買えるようになったよ`} />
                </span>
              </div>
            ))}
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text="町に戻ったらショップをのぞいてみよう" />
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
