"use client";

import { useState } from "react";

import { DisplaySettings } from "@/components/app/display-settings";
import { useMenuShown } from "@/components/app/menu-presence";

/**
 * 画面右下に浮かぶ、文字の大きさ・ふりがなの切替(RootLayoutに配置)。
 * 下のメニューかクイズ中のヘッダーが出ている画面では、そちらに設定があるので出さない(設計書4-7)
 */
export function AccessibilityControls() {
  const menuShown = useMenuShown();
  const [open, setOpen] = useState(false);

  if (menuShown) return null;

  return (
    <div className="fixed right-3 bottom-20 z-50">
      {open && (
        <div className="mb-2 w-64 rounded-2xl bg-[#fffaf0] p-4 shadow-[0_8px_22px_rgba(40,70,90,0.2)]">
          <DisplaySettings />
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="表示設定(文字サイズ・ふりがな)を開く"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-lg shadow-lg hover:bg-muted"
      >
        文A
      </button>
    </div>
  );
}
