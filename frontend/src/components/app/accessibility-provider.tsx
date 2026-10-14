"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { TimerMode } from "@/lib/stage-timer";

type FontScale = "base" | "lg" | "xl";

type AccessibilitySettings = {
  fontScale: FontScale;
  furigana: boolean;
  /** ステージの制限時間: ふつう・ゆっくり(2倍)・なし */
  timer: TimerMode;
};

type AccessibilityContextValue = AccessibilitySettings & {
  setFontScale: (scale: FontScale) => void;
  toggleFurigana: () => void;
  setTimer: (timer: TimerMode) => void;
};

const STORAGE_KEY = "spra-go:a11y";

const defaultSettings: AccessibilitySettings = {
  fontScale: "base",
  furigana: false,
  timer: "normal",
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null,
);

function applyToDocument(settings: AccessibilitySettings) {
  document.documentElement.dataset.fontScale = settings.fontScale;
  document.documentElement.dataset.furigana = settings.furigana
    ? "on"
    : "off";
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] =
    useState<AccessibilitySettings>(defaultSettings);

  useEffect(() => {
    (async () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AccessibilitySettings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // localStorageが使えない環境では既定値のまま
      }
    })();
  }, []);

  useEffect(() => {
    applyToDocument(settings);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // 保存できなくても表示には影響しない
    }
  }, [settings]);

  const value: AccessibilityContextValue = {
    ...settings,
    setFontScale: (fontScale) => setSettings((prev) => ({ ...prev, fontScale })),
    toggleFurigana: () =>
      setSettings((prev) => ({ ...prev, furigana: !prev.furigana })),
    setTimer: (timer) => setSettings((prev) => ({ ...prev, timer })),
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibility は AccessibilityProvider の内側でのみ使用できます",
    );
  }
  return ctx;
}
