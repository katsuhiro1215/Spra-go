"use client";

import Image from "next/image";

import { soundFace } from "@/components/app/sound-face";
import { useSound } from "@/components/app/sound-provider";
import { useFloatingSettingsShown } from "@/components/app/use-floating-settings";
import { SPRU_FACES } from "@/components/spru/spru-assets";

/**
 * 画面右下に浮かぶ、効果音のオン・オフ(スプルの顔、設計書4-7)。
 * 右下の「文A」が出ている画面ではその上、出ていない画面(プレイヤーの画面)では1段下に置く
 */
export function SoundControls() {
  const { enabled, toggleEnabled } = useSound();
  const floatingShown = useFloatingSettingsShown();
  const look = soundFace(enabled);
  const face = SPRU_FACES[look.face];

  return (
    <button
      onClick={toggleEnabled}
      aria-pressed={enabled}
      aria-label={enabled ? "効果音をオフにする" : "効果音をオンにする"}
      className={`fixed right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_3px_8px_rgba(0,0,0,0.2)] ${
        floatingShown ? "bottom-36" : "bottom-20"
      }`}
    >
      <Image
        src={face.src}
        alt=""
        width={36}
        height={36}
        className={`h-9 w-9 rounded-full object-cover ${look.dim ? "opacity-50 grayscale" : ""}`}
      />
      <span
        aria-hidden
        className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black text-white ${
          enabled ? "bg-[#3b7f26]" : "bg-[#8a7a5a]"
        }`}
      >
        {look.mark}
      </span>
    </button>
  );
}
