"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { SPRU_IMAGES } from "@/components/spru/spru-assets";

import { currentScore, meters, type RunState } from "./run-engine";
import { RunGame } from "./run-game";
import { RUN_HINT } from "./run-view";

type Phase = { kind: "ready" } | { kind: "playing"; seed: number } | { kind: "result"; state: RunState };

/**
 * スプルラン(docs/design/2026-10-22-spru-run-design.md)。段階1の試作: サーバーにはつながず、遊べるだけ。
 * ベストは、この画面を開いているあいだだけ覚える
 */
export function RunPageView() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "ready" });
  const [best, setBest] = useState<number | null>(null);

  const start = () => setPhase({ kind: "playing", seed: Math.floor(Math.random() * 1_000_000) + 1 });
  const onFinish = useCallback((state: RunState) => {
    setBest((current) => Math.max(current ?? 0, currentScore(state)));
    setPhase({ kind: "result", state });
  }, []);
  const onQuit = useCallback(() => setPhase({ kind: "ready" }), []);

  if (phase.kind === "playing") {
    return <RunGame key={phase.seed} seed={phase.seed} onFinish={onFinish} onQuit={onQuit} />;
  }

  const result = phase.kind === "result" ? phase.state : null;
  const score = result ? currentScore(result) : null;

  return (
    <main className="flex min-h-dvh justify-center bg-gradient-to-b from-[#8fd3ff] to-[#e8f7ff] px-4 py-6 text-[#3b3226]">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="rounded-full bg-[#ffef9e] px-3 py-1 text-xs font-black text-[#7a5a12]">しさく(試作)</p>
        <h1 className="text-3xl font-black">スプルラン</h1>
        <Image src={result ? SPRU_IMAGES.cheer.src : SPRU_IMAGES.run.src} alt="" width={110} height={180} className="h-40 w-auto" loading="eager" />

        {result && score !== null ? (
          <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-center shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
            <p className="text-sm font-bold">
              <AutoFurigana text="きょうの記録" />
            </p>
            <p className="mt-1 text-5xl font-black">{score}点</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-base font-black">
              <p className="rounded-2xl bg-white px-3 py-2">{meters(result.distance)}m</p>
              <p className="rounded-2xl bg-white px-3 py-2">
                <AutoFurigana text="タネ" /> {result.seedValue}
              </p>
            </div>
            {best !== null && score >= best && <p className="mt-3 text-base font-black text-[#e0457b]">ベスト！</p>}
            {best !== null && score < best && <p className="mt-3 text-sm font-bold">ベスト {best}点</p>}
          </div>
        ) : (
          <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-center text-base font-bold shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
            <p>
              <AutoFurigana text="じゃまものをジャンプでこえて、タネを集めよう！" />
            </p>
            <p className="mt-2 text-sm">
              <AutoFurigana text={RUN_HINT} />
            </p>
          </div>
        )}

        <div className="grid w-full grid-cols-2 gap-3">
          <AppButton variant="default" className="h-14" onClick={() => router.push("/")}>
            もどる
          </AppButton>
          <AppButton variant="primary" className="h-14 text-lg" onClick={start}>
            {result ? "もう1回" : "はしる！"}
          </AppButton>
        </div>
      </div>
    </main>
  );
}
