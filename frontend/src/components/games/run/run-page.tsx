"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { costumeImage } from "@/components/spru/costume";
import { SPRU_IMAGES } from "@/components/spru/spru-assets";

import { abandonRealRun, fetchRunSummary, finishRealRun, startRealRun, type RunFinish, type RunStart, type RunSummary } from "./run-api";
import { currentScore, meters, type RunState } from "./run-engine";
import { playsLeftText, quitAction, realButtonState } from "./run-flow";
import { RunGame } from "./run-game";
import { RUN_HINT } from "./run-view";

type Phase =
  | { kind: "ready" }
  | { kind: "confirm" }
  | { kind: "playing"; mode: "practice"; seed: number; startMs: number }
  | { kind: "playing"; mode: "real"; start: RunStart }
  | { kind: "saving" }
  | { kind: "result"; mode: "practice"; state: RunState }
  | { kind: "result"; mode: "real"; state: RunState; saved: RunFinish | null };

/** 画面の高さから決める、床を積める高さ(本番は始めるときにサーバーへ送る。run-game.tsx と同じ計算) */
function screenCeiling(): number {
  const scale = Math.min(window.innerWidth, 448) / 340;
  return Math.round(Math.max(300, Math.min(640, (window.innerHeight * 0.82 - 130) / scale)));
}

/**
 * スプルラン(docs/design/2026-10-22-spru-run-design.md 14-2)。
 * 練習: 何回でも・タネは出ない・サーバーに送らない(ベストはこの画面を開いているあいだだけ)。
 * 本番: 1日2回・タネ・ランキング。始める前に確認の画面を出す
 */
export function RunPageView() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "ready" });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [practiceBest, setPracticeBest] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => void fetchRunSummary().then(setSummary), []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 試作のあいだ、「?t=30」のようにURLに足すと、練習で30秒目の状態から始められる(後半のパターンを試すため)
  const startPractice = () => {
    const seconds = Number(new URLSearchParams(window.location.search).get("t"));
    setPhase({ kind: "playing", mode: "practice", seed: Math.floor(Math.random() * 1_000_000) + 1, startMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0 });
  };

  const startReal = async () => {
    setError(null);
    setPhase({ kind: "saving" });
    const start = await startRealRun(screenCeiling());
    if (!start) {
      setError("本番を始められませんでした。もう一度ためしてね");
      setPhase({ kind: "ready" });
      reload();
      return;
    }
    setSummary(start);
    setPhase({ kind: "playing", mode: "real", start });
  };

  /** 終えた: 本番(playId あり)はサーバーに送って点数とタネを決めてもらう。練習は画面の中だけ */
  const finishPlay = async (playId: number | null, state: RunState) => {
    if (playId === null) {
      setPracticeBest((current) => Math.max(current ?? 0, currentScore(state)));
      setPhase({ kind: "result", mode: "practice", state });
      return;
    }
    setPhase({ kind: "saving" });
    const saved = await finishRealRun(playId, meters(state.distance), state.seedValue);
    if (saved) setSummary(saved);
    setPhase({ kind: "result", mode: "real", state, saved });
  };

  /** やめる: 始めたばかりの本番は回を戻す。それ以外の本番は、そこまでの記録で終える */
  const quitPlay = async (playId: number | null, state: RunState, sinceStartMs: number) => {
    if (playId === null) {
      setPhase({ kind: "ready" });
      return;
    }
    if (quitAction(sinceStartMs) === "abandon") {
      setPhase({ kind: "saving" });
      const after = await abandonRealRun(playId);
      if (after) setSummary(after);
      setPhase({ kind: "ready" });
      return;
    }
    await finishPlay(playId, state);
  };

  if (phase.kind === "playing") {
    return phase.mode === "real" ? (
      <RunGame
        key={phase.start.play_id}
        mode="real"
        seed={phase.start.seed}
        ceiling={phase.start.ceiling}
        onFinish={(state) => void finishPlay(phase.start.play_id, state)}
        onQuit={(state, since) => void quitPlay(phase.start.play_id, state, since)}
      />
    ) : (
      <RunGame
        key={phase.seed}
        mode="practice"
        seed={phase.seed}
        startMs={phase.startMs}
        onFinish={(state) => void finishPlay(null, state)}
        onQuit={(state, since) => void quitPlay(null, state, since)}
      />
    );
  }

  const result = phase.kind === "result" ? phase : null;
  const score = result ? currentScore(result.state) : null;
  const real = realButtonState(summary ? summary.real_plays_left : null);
  const saved = result?.mode === "real" ? result.saved : null;
  const costume = costumeImage(summary?.costume_key);

  return (
    <main className="flex min-h-dvh justify-center bg-gradient-to-b from-[#8fd3ff] to-[#e8f7ff] px-4 py-6 text-[#3b3226]">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        {summary?.limited && summary.days_left !== null && (
          <p className="rounded-full bg-[#ffef9e] px-3 py-1 text-xs font-black text-[#7a5a12]">
            <AutoFurigana text={`期間限定　あと${summary.days_left}日`} />
          </p>
        )}
        <h1 className="text-3xl font-black">スプルラン</h1>
        {costume ? (
          <Image src={costume.src} alt="" width={costume.width} height={costume.height} unoptimized className="h-36 w-auto" loading="eager" />
        ) : (
          <Image src={result ? SPRU_IMAGES.cheer.src : SPRU_IMAGES.run.src} alt="" width={110} height={180} className="h-36 w-auto" loading="eager" />
        )}

        {summary && (
          <p className="rounded-full bg-white/90 px-4 py-1 text-sm font-black text-[#7a5a12]">
            <AutoFurigana text={`ランのタネ ${summary.seeds}個`} />
          </p>
        )}

        {result && score !== null ? (
          <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-center shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
            <p className="text-sm font-bold">
              <AutoFurigana text={result.mode === "real" ? "本番の記録" : "練習の記録"} />
            </p>
            <p className="mt-1 text-5xl font-black">{saved ? saved.score : score}点</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-base font-black">
              <p className="rounded-2xl bg-white px-3 py-2">{meters(result.state.distance)}m</p>
              <p className="rounded-2xl bg-white px-3 py-2">
                <AutoFurigana text="タネ" /> {result.state.seedValue}
              </p>
            </div>
            {result.mode === "real" ? (
              saved ? (
                <div className="mt-3 text-sm font-bold">
                  <p className="text-base font-black text-[#7a5a12]">
                    <AutoFurigana text={`ランのタネ +${saved.seeds_earned}個`} />
                  </p>
                  {saved.bonus > 0 && (
                    <p>
                      <AutoFurigana text={`（きょうの1回目ボーナス +${saved.bonus}個ふくむ）`} />
                    </p>
                  )}
                  {saved.rank !== null && (
                    <p className="mt-1">
                      <AutoFurigana text={`家族のランキング ${saved.rank}位`} />
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-[#a33]">記録を送れませんでした。電波のよいところで、もう一度ためしてね</p>
              )
            ) : (
              <p className="mt-3 text-sm font-bold">
                {practiceBest !== null && score >= practiceBest ? "この画面でのベスト！" : `この画面でのベスト ${practiceBest ?? score}点`}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full rounded-3xl bg-[#fffaf0] p-5 text-center text-base font-bold shadow-[0_6px_16px_rgba(0,0,0,0.15)]">
            <p>
              <AutoFurigana text="じゃまものをジャンプでこえて、タネを集めよう！" />
            </p>
            <p className="mt-2 text-sm">
              <AutoFurigana text={RUN_HINT} />
            </p>
            {summary && (
              <p className="mt-2 text-sm text-[#7a5a12]">
                <AutoFurigana text={playsLeftText(summary.real_plays_left)} />
                {summary.best_score !== null && <> ／ ベスト {summary.best_score}点</>}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm font-bold text-[#a33]">{error}</p>}

        <div className="flex w-full flex-col gap-3">
          <AppButton variant="primary" className="h-14 text-lg" disabled={!real.enabled || phase.kind === "saving"} onClick={() => setPhase({ kind: "confirm" })}>
            {real.label}
          </AppButton>
          <AppButton variant="default" className="h-14" disabled={phase.kind === "saving"} onClick={startPractice}>
            <span className="flex flex-col leading-tight">
              <span>試してみる（練習）</span>
              <span className="text-xs font-bold opacity-80">何回でも ／ タネは出ないよ</span>
            </span>
          </AppButton>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/games/spru-run/ranking" className="contents">
              <AppButton variant="default" className="h-12">ランキング</AppButton>
            </Link>
            <Link href="/games/spru-run/shop" className="contents">
              <AppButton variant="default" className="h-12">タネ交換所</AppButton>
            </Link>
          </div>
          <AppButton variant="default" className="h-12" onClick={() => router.push("/")}>
            もどる
          </AppButton>
        </div>
      </div>

      {phase.kind === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.5)] px-6">
          <div role="dialog" aria-modal="true" aria-labelledby="run-real-title" className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center">
            <p id="run-real-title" className="text-base font-black">
              <AutoFurigana text={`本番にちょうせん（のこり${summary?.real_plays_left ?? 0}回）`} />
            </p>
            <p className="text-sm font-bold">
              <AutoFurigana text="本番は、ランキングとタネに入るよ。はじめる？" />
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <AppButton variant="default" onClick={() => setPhase({ kind: "ready" })}>
                やめる
              </AppButton>
              <AppButton variant="primary" onClick={startReal}>
                はじめる
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
