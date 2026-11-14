"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { CLEAR_STAGE, createSwim, currentScore, dashFlap, DASH_WINDOW_MS, flap, SWIM_HEARTS, tick, WORLD_W, type SwimState } from "./swim-engine";
import { SWIM_ASSETS } from "./swim-assets";
import { quitMessage, type SwimMode } from "./swim-flow";
import { bottomCss, isBlinkOff, obstacleDraw, scrollCqw, sizeCqw, SWIM_HINT, spruDraw, spruPose } from "./swim-view";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
/** スプラの絵の大きさ(ゲームの中の広さ) */
const SPRU_DRAW_H = 70;
const COIN_DRAW_H = 36;
/** 上の表示のぶん、天井を低くしておく余白(px)。run-game.tsx の ceilingForScreen と同じ考え方 */
const TOP_UI_MARGIN = 100;

/** この画面で、泳げる高さ(ゲームの中の広さ)。画面の高さから、上の表示のぶんを引く。本番は始めるときにサーバーへ送る */
export function ceilingForScreen(): number {
  const scale = Math.min(window.innerWidth, 448) / WORLD_W;
  return Math.max(220, Math.min(520, (window.innerHeight - TOP_UI_MARGIN) / scale));
}

/** スプラスイムのゲーム画面(docs/design/2026-11-10-spru-swim-design.md)。練習: 何回でも・サーバーに送らない。本番: サーバーから渡された種・画面の高さで泳ぐ */
export function SwimGame({
  seed,
  startMs = 0,
  ceiling,
  mode,
  onFinish,
  onQuit,
}: {
  seed: number;
  startMs?: number;
  /** 本番は、始めるときにサーバーへ送った高さ。練習は省略(この画面の高さ) */
  ceiling?: number;
  mode: SwimMode;
  onFinish: (state: SwimState) => void;
  /** やめる。そこまでの状態と、始めてからの時間(ミリ秒) */
  onQuit: (state: SwimState, sinceStartMs: number) => void;
}) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createSwim(seed, startMs, ceiling ?? ceilingForScreen()));
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [confirmQuit, setConfirmQuit] = useState(false);
  /** やめる確認を開いた時の、始めてからの時間(ミリ秒) */
  const [quitSinceMs, setQuitSinceMs] = useState(0);
  const [calm] = useState(() => prefersReducedMotion());
  const pausedRef = useRef(true);
  const finishedRef = useRef(false);
  const [showClear, setShowClear] = useState(false);
  /** 直前にタップした実時刻(performance.now())。すばやく2回続けてタップ(ダブルタップ)したら、強く上がる */
  const lastTapRef = useRef(-Infinity);

  const doFlap = () => {
    const now = performance.now();
    const isDouble = now - lastTapRef.current <= DASH_WINDOW_MS;
    lastTapRef.current = isDouble ? -Infinity : now;
    setState((current) => (isDouble ? dashFlap(current) : flap(current)));
  };

  useEffect(() => {
    pausedRef.current = countdown > 0 || confirmQuit;
  }, [countdown, confirmQuit]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    let justClearedPending = false;
    const loop = (now: number) => {
      if (last !== null && !pausedRef.current) {
        const dt = now - last;
        setState((current) => {
          const next = tick(current, dt);
          if (next.justCleared) justClearedPending = true;
          return next;
        });
      }
      last = now;
      // 20ステージ クリアの合図を見たら、お祝いを出す(useEffectの本体ではなく、このループの中で行う)
      if (justClearedPending) {
        justClearedPending = false;
        playSound("swimBigClear");
        setShowClear(true);
        setTimeout(() => setShowClear(false), 2200);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const resetClock = () => {
      last = null;
    };
    document.addEventListener("visibilitychange", resetClock);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, [playSound]);

  // タップ(マリオのジャンプと同じ。押した瞬間だけ反応する)
  const onTap = () => {
    if (pausedRef.current) return;
    doFlap();
  };

  // キーボードの スペース・↑
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "ArrowUp") return;
      event.preventDefault();
      if (pausedRef.current || event.repeat) return;
      doFlap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 音
  useEffect(() => {
    if (state.pickupCount > 0) playSound("coin");
  }, [state.pickupCount, playSound]);
  useEffect(() => {
    if (state.hitCount > 0) playSound("swimBump");
  }, [state.hitCount, playSound]);
  const prevStageRef = useRef(state.stage);
  useEffect(() => {
    if (state.stage > prevStageRef.current) playSound("swimClear");
    prevStageRef.current = state.stage;
  }, [state.stage, playSound]);

  useEffect(() => {
    if (state.phase !== "done" || finishedRef.current) return;
    finishedRef.current = true;
    playSound("allCorrect");
    onFinish(state);
  }, [state, onFinish, playSound]);

  const spru = spruDraw(spruPose(state), SPRU_DRAW_H);
  const scroll = (factor: number): CSSProperties["backgroundPositionX"] => (calm && factor < 1 ? 0 : scrollCqw(state.distance, factor));
  const seabedCqw = (100 * SWIM_ASSETS["bg-seabed"].height) / SWIM_ASSETS["bg-seabed"].width;

  return (
    <div className="fixed inset-0 z-40 flex touch-none justify-center bg-[#1c8fe0] select-none" onPointerDown={onTap}>
      {/* 場面(画面いっぱい。縦は state.ceiling がちょうど画面の高さになるよう、始める前に計算してある) */}
      <div
        className="relative h-full w-full max-w-md overflow-hidden bg-[#1c8fe0] bg-cover bg-top [container-type:size]"
        style={{ backgroundImage: `url(${SWIM_ASSETS["bg-surface"].src})` }}
      >
        {/* 海底(いちばん手前。横に流れる) */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-repeat-x"
          style={{ height: `${seabedCqw}cqw`, backgroundImage: `url(${SWIM_ASSETS["bg-seabed"].src})`, backgroundSize: "100cqw auto", backgroundPositionX: scroll(1) }}
        />

        {/* コイン */}
        {state.coins
          .filter((c) => !c.taken)
          .map((c) => {
            const asset = SWIM_ASSETS[c.big ? "big-coin" : "coin"];
            const height = c.big ? COIN_DRAW_H * 1.3 : COIN_DRAW_H;
            const width = (height * asset.width) / asset.height;
            return (
              <div
                key={`c-${c.x}-${c.y}`}
                className="pointer-events-none absolute"
                style={{ left: sizeCqw(c.x - state.distance - width / 2), bottom: bottomCss(c.y - height / 2), width: sizeCqw(width), height: sizeCqw(height) }}
              >
                <Image src={asset.src} alt={c.big ? "光るコイン" : "コイン"} fill sizes="40px" unoptimized className="object-contain" />
              </div>
            );
          })}

        {/* じゃまもの(海の生物。単体で、いろいろな高さに置かれる)。ゆらゆら上下に揺れて見える(当たりは動かない。run-game.tsx のハチと同じ考え方) */}
        {state.obstacles.map((o) => {
          const draw = obstacleDraw(o);
          const bob = Math.sin(state.elapsedMs / 260 + o.x) * 4;
          return (
            <div
              key={`o-${o.x}-${o.y}`}
              className={cn("pointer-events-none absolute", o.hit && "opacity-60")}
              style={{
                left: sizeCqw(draw.left - state.distance),
                bottom: bottomCss(draw.bottom + bob),
                width: sizeCqw(draw.width),
                height: sizeCqw(draw.height),
              }}
            >
              <Image src={draw.src} alt="" fill sizes="120px" unoptimized className="object-contain" />
            </div>
          );
        })}

        {/* スプラ */}
        <div
          className={cn("pointer-events-none absolute", isBlinkOff(state) && "opacity-30")}
          style={{
            left: sizeCqw(70 + 15 - spru.width / 2),
            bottom: bottomCss(state.y - spru.height / 2 + 11),
            width: sizeCqw(spru.width),
            height: sizeCqw(spru.height),
          }}
        >
          <Image src={spru.src} alt="スプラ" fill sizes="90px" unoptimized className="object-contain" loading="eager" />
        </div>

        {/* 上の表示 */}
        <div className="absolute inset-x-0 top-0 px-3 pt-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <AppButton
              variant="default"
              size="sm"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setQuitSinceMs(Date.now() - startedAt.current);
                setConfirmQuit(true);
              }}
            >
              やめる
            </AppButton>
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-[#0a4a7a]">
              ステージ {Math.min(state.stage, CLEAR_STAGE)}
              {state.stage > CLEAR_STAGE ? "+" : ""}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-[#7a5a12]">コイン {state.coinValue}</span>
            <span aria-label={`ハート${state.hearts}つ`} className="rounded-full bg-white/90 px-3 py-1 text-sm">
              {Array.from({ length: SWIM_HEARTS }, (_, i) => (
                <span key={i} aria-hidden className={i < state.hearts ? "text-[#e0457b]" : "text-[#e0457b] opacity-25"}>
                  ♥
                </span>
              ))}
            </span>
          </div>
          <p className="mt-3 text-center text-3xl font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">{currentScore(state)}点</p>
          {mode === "practice" && (
            <p className="mt-1 text-center">
              <span className="rounded-full bg-white/90 px-3 py-0.5 text-xs font-black text-[#0a4a7a]">練習(記録は残らないよ)</span>
            </p>
          )}
        </div>

        {countdown > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30">
            <p key={countdown} className="animate-pop-in text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
              {countdown}
            </p>
            <p className="mx-6 mt-3 rounded-2xl bg-white/90 px-4 py-2 text-center text-base font-black text-[#0a4a7a]">
              <AutoFurigana text={SWIM_HINT} />
            </p>
          </div>
        )}

        {showClear && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[rgba(10,60,120,0.35)]">
            <p className="animate-pop-in text-5xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
              <AutoFurigana text={`${CLEAR_STAGE}ステージ クリア！`} />
            </p>
            <p className="mt-2 rounded-2xl bg-white/90 px-4 py-2 text-center text-sm font-black text-[#0a4a7a]">
              <AutoFurigana text="ここからは、どこまで行けるかな？" />
            </p>
          </div>
        )}
      </div>

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.5)] px-6" onPointerDown={(event) => event.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-labelledby="swim-quit-title" className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center text-[#3b3226]">
            <p id="swim-quit-title" className="text-base font-black">
              <AutoFurigana text={quitMessage(mode, quitSinceMs)} />
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <AppButton variant="default" onClick={() => onQuit(state, quitSinceMs)}>
                やめる
              </AppButton>
              <AppButton variant="primary" onClick={() => setConfirmQuit(false)}>
                つづける
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { WORLD_W };
