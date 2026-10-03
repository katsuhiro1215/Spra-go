"use client";

import { useEffect, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import { detectPlatform, INSTALL_DISMISSED_KEY, shouldShowInstallGuide, type Platform } from "@/lib/pwa";

/** Android の Chrome が渡す「追加の確認を出す」イベント(型は標準にない) */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

type Env = { platform: Platform; standalone: boolean; dismissed: boolean };

function readEnv(): Env {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    // 保存できない環境でも、案内は出す
  }

  return {
    platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    dismissed,
  };
}

/** 「ホーム画面に追加」の案内(docs/design/2026-10-03-closed-beta-design.md 6-1)。ホーム画面から開いている・「あとで」を押した・パソコンでは出さない */
export function InstallGuide() {
  const [env, setEnv] = useState<Env | null>(null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    // 画面に出てから、端末の情報を読む(サーバーでは読めない)
    const frame = requestAnimationFrame(() => setEnv(readEnv()));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!env || !shouldShowInstallGuide(env)) return null;

  function dismiss() {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // 保存できなくても、この画面では閉じる
    }
    setEnv((prev) => (prev ? { ...prev, dismissed: true } : prev));
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-lg">
      <p className="text-sm font-black">
        <AutoFurigana text="ホーム画面にのせると、すぐ あそべるよ" />
      </p>

      {env.platform === "ios" ? (
        <ol className="list-inside list-decimal text-xs font-bold text-[#6b5d45]">
          <li>
            <AutoFurigana text="画面の下の「共有」ボタン（□に↑）を押す" />
          </li>
          <li>
            <AutoFurigana text="「ホーム画面に追加」を押す" />
          </li>
        </ol>
      ) : prompt ? (
        <Button
          variant="secondary"
          size="sm"
          className="self-start normal-case"
          onClick={() => {
            void prompt.prompt();
            setPrompt(null);
          }}
        >
          <AutoFurigana text="ホーム画面に追加" />
        </Button>
      ) : (
        <p className="text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text="ブラウザのメニュー（⋮）から「ホーム画面に追加」を押してね" />
        </p>
      )}

      <Button variant="ghost" size="sm" className="self-start normal-case" onClick={dismiss}>
        <AutoFurigana text="あとで" />
      </Button>
    </div>
  );
}
