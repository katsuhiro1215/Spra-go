"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SoundKey = "correct" | "incorrect";

const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
};

type SoundContextValue = {
  enabled: boolean;
  toggleEnabled: () => void;
  play: (key: SoundKey) => void;
};

const STORAGE_KEY = "spra-go:sound";

// ブラウザは「ユーザーが一度も画面をクリックしていない状態」での自動再生を
// 禁止しているため、既定値はOFF。ユーザーが明示的にONにした場合のみ鳴らす。
const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const audioCache = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});

  useEffect(() => {
    (async () => {
      try {
        setEnabled(window.localStorage.getItem(STORAGE_KEY) === "on");
      } catch {
        // localStorageが使えない環境では既定値(OFF)のまま
      }
    })();
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {
        // 保存できなくても切替自体には影響しない
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (key: SoundKey) => {
      if (!enabled) return;
      let audio = audioCache.current[key];
      if (!audio) {
        audio = new Audio(SOUND_FILES[key]);
        audioCache.current[key] = audio;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        // ファイル未配置・再生失敗時も無視(効果音は演出の付加要素のため)
      });
    },
    [enabled],
  );

  return (
    <SoundContext.Provider value={{ enabled, toggleEnabled, play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound は SoundProvider の内側でのみ使用できます");
  }
  return ctx;
}
