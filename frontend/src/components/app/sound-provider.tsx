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

import type { BgmTrack } from "@/lib/bgm-route";

export type SoundKey = "correct" | "incorrect" | "allCorrect";
export type BgmKey = BgmTrack;

const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  allCorrect: "/sounds/allCorrect.mp3",
};

// Suno v6で作った曲。ループ用に切り出し、音量を-16 LUFSにそろえてある(制作記録: company/spra/spra-theme/docs/)
const BGM_FILES: Record<BgmKey, string> = {
  home: "/sounds/bgm-home.mp3",
  quiz: "/sounds/bgm-quiz.mp3",
  minigame: "/sounds/bgm-minigame.mp3",
  space: "/sounds/bgm-space.mp3",
};

const BGM_VOLUME = 0.35;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 400;
const FADE_STEP_MS = 40;

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

  /** 音量を、いまの値から目標まで少しずつ変える。終わったら done を呼ぶ */
  const fadeAudio = useCallback((audio: HTMLAudioElement, to: number, ms: number, done?: () => void) => {
    const from = audio.volume;
    const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / steps));
      if (step >= steps) {
        window.clearInterval(timer);
        done?.();
      }
    }, FADE_STEP_MS);
  }, []);

  // 止めるときは、音を小さくしてから止める(ぷつっと切れないように)
  const stopBgmAudio = useCallback(() => {
    const audio = bgmAudioRef.current;
    bgmAudioRef.current = null;
    if (!audio) return;
    fadeAudio(audio, 0, FADE_OUT_MS, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [fadeAudio]);

  const startBgmAudio = useCallback(
    (key: BgmKey) => {
      stopBgmAudio();
      const audio = new Audio(BGM_FILES[key]);
      audio.loop = true;
      audio.volume = 0;
      bgmAudioRef.current = audio;
      audio
        .play()
        .then(() => fadeAudio(audio, BGM_VOLUME, FADE_IN_MS))
        .catch(() => {
          // ファイル未配置・再生失敗時も無視(BGMは演出の付加要素のため)
        });
    },
    [fadeAudio, stopBgmAudio],
  );

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
      const alreadyPlaying = bgmKeyRef.current === key && bgmAudioRef.current !== null;
      bgmKeyRef.current = key;
      if (!enabled || alreadyPlaying) return; // 同じ曲が鳴っているなら、画面を移っても頭からやり直さない
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
