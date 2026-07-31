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

export type SoundKey = "correct" | "incorrect" | "allCorrect";
export type BgmKey = "bgm1";

const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  allCorrect: "/sounds/allCorrect.mp3",
};

const BGM_FILES: Record<BgmKey, string> = {
  bgm1: "/sounds/bgm1.mp3",
};

const BGM_VOLUME = 0.35;

type SoundContextValue = {
  enabled: boolean;
  toggleEnabled: () => void;
  play: (key: SoundKey) => void;
  playBgm: (key: BgmKey) => void;
  stopBgm: () => void;
};

const STORAGE_KEY = "spra-go:sound";

// ブラウザは「ユーザーが一度も画面をクリックしていない状態」での自動再生を
// 禁止しているため、既定値はOFF。ユーザーが明示的にONにした場合のみ鳴らす。
const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const audioCache = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmKeyRef = useRef<BgmKey | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setEnabled(window.localStorage.getItem(STORAGE_KEY) === "on");
      } catch {
        // localStorageが使えない環境では既定値(OFF)のまま
      }
    })();
  }, []);

  const stopBgmAudio = useCallback(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
      bgmAudioRef.current = null;
    }
  }, []);

  const startBgmAudio = useCallback((key: BgmKey) => {
    stopBgmAudio();
    const audio = new Audio(BGM_FILES[key]);
    audio.loop = true;
    audio.volume = BGM_VOLUME;
    bgmAudioRef.current = audio;
    audio.play().catch(() => {
      // ファイル未配置・再生失敗時も無視(BGMは演出の付加要素のため)
    });
    // stopBgmAudioを依存に含めると呼び出しごとに再生成されてしまうため、
    // ここでは意図的に外している(内部でrefのみ扱う安定した関数)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 再生中にOFFへ切り替えたら止める、ONに戻したら(BGM再生が要求されていれば)再開する
  useEffect(() => {
    if (!enabled) {
      stopBgmAudio();
    } else if (bgmKeyRef.current) {
      startBgmAudio(bgmKeyRef.current);
    }
  }, [enabled, startBgmAudio, stopBgmAudio]);

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

  const playBgm = useCallback(
    (key: BgmKey) => {
      bgmKeyRef.current = key;
      if (!enabled) return;
      startBgmAudio(key);
    },
    [enabled, startBgmAudio],
  );

  const stopBgm = useCallback(() => {
    bgmKeyRef.current = null;
    stopBgmAudio();
  }, [stopBgmAudio]);

  return (
    <SoundContext.Provider
      value={{ enabled, toggleEnabled, play, playBgm, stopBgm }}
    >
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
