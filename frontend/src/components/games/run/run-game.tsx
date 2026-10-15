"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { SPRU_IMAGES } from "@/components/spru/spru-assets";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  createRun,
  currentScore,
  jump,
  meters,
  RUN_HEARTS,
  SEED_R,
  SPRU_W,
  SPRU_X,
  tick,
  type ObstacleKind,
  type RunState,
} from "./run-engine";
import { bottomPct, heightPct, isBlinkOff, leftPct, RUN_HINT, scrollCqw, spruPose, widthPct } from "./run-view";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
/** スプルの絵の大きさ(ゲームの中の広さ。当たりの箱より大きく描く) */
const SPRU_DRAW_H = 78;

/** スプルランのゲームの画面(docs/design/2026-10-22-spru-run-design.md 5章)。絵が届くまでは、スプル以外を仮の図形で描く */
export function RunGame({ seed, onFinish, onQuit }: { seed: number; onFinish: (state: RunState) => void; onQuit: () => void }) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createRun(seed));
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [calm] = useState(() => prefersReducedMotion());
  const pausedRef = useRef(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = countdown > 0 || confirmQuit;
  }, [countdown, confirmQuit]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 時間を進める。タブを離れると requestAnimationFrame が止まるので、戻ったときは時計を合わせ直す
  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      if (last !== null && !pausedRef.current) {
        const dt = now - last;
        setState((current) => tick(current, dt));
      }
      last = now;
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
  }, []);

  // キーボードの スペース・↑
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "ArrowUp") return;
      event.preventDefault();
      if (pausedRef.current || event.repeat) return;
      setState((current) => jump(current));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 音
  useEffect(() => {
    if (state.jumpCount > 0) playSound("select");
  }, [state.jumpCount, playSound]);
  useEffect(() => {
    if (state.pickupCount > 0) playSound("coin");
  }, [state.pickupCount, playSound]);
  useEffect(() => {
    if (state.hitCount > 0) playSound("warning");
  }, [state.hitCount, playSound]);

  useEffect(() => {
    if (state.phase !== "done" || finishedRef.current) return;
    finishedRef.current = true;
    playSound("allCorrect");
    onFinish(state);
  }, [state, onFinish, playSound]);

  const onTap = () => {
    if (pausedRef.current) return;
    setState((current) => jump(current));
  };

  const pose = SPRU_IMAGES[spruPose(state)];
  const spruDrawW = (SPRU_DRAW_H * pose.width) / pose.height;
  const scroll = (factor: number): CSSProperties["backgroundPositionX"] => (calm && factor < 1 ? 0 : scrollCqw(state.distance, factor));

  return (
    <div className="fixed inset-0 z-40 flex touch-none justify-center bg-[#bfe7ff] select-none" onPointerDown={onTap}>
      <div className="flex h-full w-full max-w-md flex-col px-3 pt-3 pb-4">
        <div className="flex items-center justify-between gap-2 text-[#3b3226]">
          <AppButton
            variant="default"
            size="sm"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setConfirmQuit(true)}
          >
            やめる
          </AppButton>
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black">{meters(state.distance)}m</span>
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-[#7a5a12]">タネ {state.seedValue}</span>
          <span aria-label={`ハート${state.hearts}つ`} className="rounded-full bg-white/90 px-3 py-1 text-sm">
            {Array.from({ length: RUN_HEARTS }, (_, i) => (
              <span key={i} aria-hidden className={i < state.hearts ? "text-[#e0457b]" : "text-[#e0457b] opacity-25"}>
                ♥
              </span>
            ))}
          </span>
        </div>
        <p className="mt-2 text-center text-2xl font-black text-[#3b3226]" aria-live="off">
          {currentScore(state)}点
        </p>

        {/* 場面(横400×縦300の比率) */}
        <div
          className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-[0_6px_16px_rgba(0,0,0,0.2)] [container-type:inline-size]"
          style={{ background: "linear-gradient(to bottom, #8fd3ff, #d9f2ff)" }}
        >
          {/* 遠くの山 */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-[16.7%] h-[45%]"
            style={{
              backgroundImage: "radial-gradient(ellipse 26cqw 30cqw at 22cqw 100%, #a8d995 98%, transparent 100%), radial-gradient(ellipse 18cqw 20cqw at 50cqw 100%, #93cc7f 98%, transparent 100%)",
              backgroundSize: "64cqw 100%",
              backgroundRepeat: "repeat-x",
              backgroundPositionX: scroll(0.15),
            }}
          />
          {/* 近くの草はら */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-[16.7%] h-[18%]"
            style={{
              backgroundImage: "radial-gradient(ellipse 22cqw 14cqw at 11cqw 100%, #6fbf55 98%, transparent 100%)",
              backgroundSize: "26cqw 100%",
              backgroundRepeat: "repeat-x",
              backgroundPositionX: scroll(0.45),
            }}
          />
          {/* 地面 */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[16.7%] border-t-4 border-[#5aa83f]"
            style={{
              backgroundColor: "#c99a62",
              backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 4cqw, transparent 4cqw 12cqw)",
              backgroundPositionX: scroll(1),
            }}
          />

          {/* タネ */}
          {state.seeds
            .filter((seed) => !seed.taken)
            .map((seed) => (
              <div
                key={`s-${seed.x}-${seed.y}`}
                className="pointer-events-none absolute"
                style={{
                  left: leftPct(seed.x - state.distance - SEED_R),
                  bottom: bottomPct(seed.y - SEED_R),
                  width: widthPct(SEED_R * 2),
                  height: heightPct(SEED_R * 2),
                }}
              >
                <SeedArt golden={seed.golden} />
              </div>
            ))}

          {/* じゃまもの */}
          {state.obstacles.map((o) => (
            <div
              key={`o-${o.x}`}
              className={cn("pointer-events-none absolute", o.hit && "opacity-60")}
              style={{ left: leftPct(o.x - state.distance), bottom: bottomPct(0), width: widthPct(o.w), height: heightPct(Math.max(o.h, 10)) }}
            >
              <ObstacleArt kind={o.kind} />
            </div>
          ))}

          {/* スプル */}
          <div
            className={cn("pointer-events-none absolute", isBlinkOff(state) && "opacity-30")}
            style={{
              left: leftPct(SPRU_X + SPRU_W / 2 - spruDrawW / 2),
              bottom: bottomPct(state.y - 4),
              width: widthPct(spruDrawW),
              height: heightPct(SPRU_DRAW_H),
            }}
          >
            <Image src={pose.src} alt="スプル" fill sizes="80px" className="object-contain object-bottom" loading="eager" />
          </div>

          {countdown > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40">
              <p key={countdown} className="animate-pop-in text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                {countdown}
              </p>
              <p className="mx-4 mt-2 rounded-2xl bg-white/90 px-4 py-1 text-center text-sm font-black text-[#3b3226]">
                <AutoFurigana text={RUN_HINT} />
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-1 items-center justify-center rounded-3xl border-4 border-dashed border-white/80 text-lg font-black text-[#3b3226]/70">
          <AutoFurigana text="どこをタップしてもジャンプ" />
        </div>
      </div>

      {confirmQuit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.5)] px-6"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="run-quit-title"
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center text-[#3b3226]"
          >
            <p id="run-quit-title" className="text-base font-black">
              <AutoFurigana text="やめる？ここまでの記録は残らないよ" />
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <AppButton variant="default" onClick={onQuit}>
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

/** 仮のタネ(絵が届いたら差し替え) */
function SeedArt({ golden }: { golden: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" role="img" aria-label={golden ? "金のタネ" : "タネ"}>
      <ellipse cx="10" cy="12" rx="6" ry="7" fill={golden ? "#ffd24d" : "#a9773f"} stroke={golden ? "#d39a12" : "#7a5228"} strokeWidth="1.2" />
      <path d="M10 5 C10 2, 14 1, 15 3 C13 4, 11 4, 10 5Z" fill="#6fbf55" />
    </svg>
  );
}

/** 仮のじゃまもの(絵が届いたら差し替え) */
function ObstacleArt({ kind }: { kind: ObstacleKind }) {
  switch (kind) {
    case "rock":
      return <div className="h-full w-full rounded-t-[50%] rounded-b-md bg-[#9a8f86] ring-2 ring-[#6e655d]" aria-label="石" role="img" />;
    case "stump":
      return <div className="h-full w-full rounded-t-[40%] rounded-b-sm bg-[#9b6a3c] ring-2 ring-[#6d4524]" aria-label="切り株" role="img" />;
    case "puddle":
      return <div className="mt-auto h-full w-full rounded-[50%] bg-[#6cc3f0] ring-2 ring-[#3a95c9]" aria-label="水たまり" role="img" />;
    case "bush":
      return <div className="h-full w-full rounded-t-[45%] rounded-b-md bg-[#3f9a3a] ring-2 ring-[#2a6f27]" aria-label="しげみ" role="img" />;
    case "fence":
      return (
        <div
          className="h-full w-full rounded-t-md bg-[repeating-linear-gradient(0deg,#e8d2a6_0_14px,#b98d55_14px_18px)] ring-2 ring-[#8a6232]"
          aria-label="さく"
          role="img"
        />
      );
  }
}
