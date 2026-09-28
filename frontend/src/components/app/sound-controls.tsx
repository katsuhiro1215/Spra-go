"use client";

import { AssetImage } from "@/components/app/asset-image";
import { soundIcon } from "@/components/app/sound-face";
import { useSound } from "@/components/app/sound-provider";
import { useFloatingSettingsShown } from "@/components/app/use-floating-settings";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

/**
 * 画面右下に浮かぶ、効果音のオン・オフ(設計書4-7。絵は docs/design/2026-09-29-spru-icons-design.md 4-3)。
 * 右下の「文A」が出ている画面ではその上、出ていない画面(プレイヤーの画面)では1段下に置く
 */
export function SoundControls() {
  const { enabled, toggleEnabled } = useSound();
  const floatingShown = useFloatingSettingsShown();

  return (
    <button
      onClick={toggleEnabled}
      aria-pressed={enabled}
      aria-label={enabled ? "効果音をオフにする" : "効果音をオンにする"}
      className={`fixed right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.2)] ${
        floatingShown ? "bottom-36" : "bottom-20"
      }`}
    >
      <AssetImage asset={SPRU_ICONS[soundIcon(enabled)]} size={44} />
    </button>
  );
}
