"use client";

import { useSound } from "@/components/app/sound-provider";

/**
 * 画面右下に固定表示する、効果音On/Offの切替ボタン。
 * AccessibilityControls(文字サイズ・ふりがな)の真上に積む形で配置し、
 * 右下に複数のフローティングボタンが並んでも重ならないようにする。
 */
export function SoundControls() {
  const { enabled, toggleEnabled } = useSound();

  return (
    <button
      onClick={toggleEnabled}
      aria-pressed={enabled}
      aria-label={enabled ? "効果音をオフにする" : "効果音をオンにする"}
      className="fixed right-3 bottom-20 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-lg shadow-lg hover:bg-muted"
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
