"use client";

import { useState } from "react";

import { useAccessibility } from "@/components/app/accessibility-provider";

const FONT_SCALE_LABELS = {
  base: "標準",
  lg: "大",
  xl: "特大",
} as const;

/**
 * 画面右下に固定表示する、文字サイズ・ふりがな表示の切替パネル。
 * 全ページ共通(RootLayoutでAccessibilityProviderと一緒に配置)。
 */
export function AccessibilityControls() {
  const { fontScale, setFontScale, furigana, toggleFurigana } =
    useAccessibility();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-3 bottom-20 z-50">
      {open && (
        <div className="mb-2 flex w-56 flex-col gap-3 rounded-xl border border-border bg-background p-3 text-sm shadow-lg">
          <div>
            <p className="mb-1.5 font-medium">文字サイズ</p>
            <div className="flex gap-1.5">
              {(Object.keys(FONT_SCALE_LABELS) as Array<keyof typeof FONT_SCALE_LABELS>).map(
                (scale) => (
                  <button
                    key={scale}
                    onClick={() => setFontScale(scale)}
                    aria-pressed={fontScale === scale}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${
                      fontScale === scale
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {FONT_SCALE_LABELS[scale]}
                  </button>
                ),
              )}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2">
            <span className="font-medium">ふりがな表示</span>
            <input
              type="checkbox"
              checked={furigana}
              onChange={toggleFurigana}
              className="h-4 w-4"
            />
          </label>
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
