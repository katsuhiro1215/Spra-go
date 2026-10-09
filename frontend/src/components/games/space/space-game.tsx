"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { focusSizeClass, laneTextClass } from "@/components/games/catch/catch-view";
import { splitPrompt, type GameQuestion } from "@/components/games/game-question";
import { OUTING_IMAGES } from "@/components/spru/spru-assets";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  createSpaceGame,
  moveBy,
  moveTo,
  SPACE_HEARTS,
  tick,
  totalStars,
  TRAVEL,
  type SpaceSettings,
  type SpaceState,
} from "./space-engine";
import { gateLook, isVisible, itemFactor, SPACE_MOVE_HINT, starsText, type GateLook } from "./space-view";

/** ロケット・隕石・星・門の高さ(px)。絵が届くまでは、仮のSVGと枠で描く(設計書8章) */
const ROCKET_PX = 96;
const METEOR_PX = 44;
const STAR_PX = 34;
const GATE_PX = 76;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;

const GATE_CLASS: Record<GateLook, string> = {
  normal: "bg-[#fffaf0] ring-4 ring-[#8fd9ff]",
  "passed-correct": "animate-pop-in bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  "passed-wrong": "animate-catch-shake bg-[#ffd9cc] ring-4 ring-[#f28b6d]",
  answer: "bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  faded: "bg-[#fffaf0] opacity-40 ring-4 ring-[#8fd9ff]",
};

/** 位置の計算。factor が1で、ロケットの頭の上に着いた位置(高さ px のもの) */
function topOf(factor: number, heightPx: number): string {
  return `calc((100% - ${ROCKET_PX + heightPx}px) * ${factor})`;
}

/** うちゅう旅行のゲームの画面(docs/design/2026-10-09-space-trip-design.md 3・7章) */
export function SpaceGame({
  questions,
  settings,
  seed,
  onFinish,
  onQuit,
}: {
  questions: GameQuestion[];
  settings: SpaceSettings;
  seed: number;
  onFinish: (state: SpaceState) => void;
  onQuit: () => void;
}) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createSpaceGame(questions, { ...settings, calm: prefersReducedMotion() }, seed));
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const pausedRef = useRef(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = countdown > 0 || confirmQuit;
  }, [countdown, confirmQuit]);

  // 3・2・1
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

  // キーボードの ← →
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setState((current) => moveBy(current, -1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setState((current) => moveBy(current, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 門をくぐったときの音
  const lastAnswer = state.answers.at(-1);
  useEffect(() => {
    if (!lastAnswer) return;
    playSound(lastAnswer.correct ? "correct" : "incorrect");
  }, [lastAnswer, playSound]);

  // 終わり
  useEffect(() => {
    if (state.phase !== "done" || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(state);
  }, [state, onFinish]);

  const step = (direction: -1 | 1) => {
    if (pausedRef.current) return;
    setState((current) => moveBy(current, direction));
  };
  const goTo = (lane: number) => {
    if (pausedRef.current) return;
    setState((current) => moveTo(current, lane));
  };

  const question = state.questions[Math.min(state.index, state.questions.length - 1)];
  const { focus, rest } = splitPrompt(question.prompt);
  const lanes = state.settings.lanes;
  const laneWidth = 100 / lanes;
  const stars = totalStars(state) + state.stars;
  const gateFactor = itemFactor(state.progress, 1, TRAVEL);
  const rocket = OUTING_IMAGES.back;

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-[#10163a]">
      <div className="flex h-full w-full max-w-md flex-col px-3 pt-3 pb-4">
        <div className="flex items-center justify-between gap-2 text-[#3b3226]">
          <AppButton variant="default" size="sm" onClick={() => setConfirmQuit(true)}>
            やめる
          </AppButton>
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black">
            {state.index + 1}/{state.questions.length}
          </span>
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black">{state.score + state.stars}点</span>
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-black text-[#c98f12]">{starsText(stars)}</span>
          <span aria-label={`ハート${state.hearts}つ`} className="rounded-full bg-white/90 px-3 py-1 text-sm">
            {Array.from({ length: SPACE_HEARTS }, (_, i) => (
              <span key={i} aria-hidden className={i < state.hearts ? "text-[#e0457b]" : "text-[#e0457b] opacity-25"}>
                ♥
              </span>
            ))}
          </span>
        </div>

        <div className="mt-3 rounded-3xl bg-[#fffaf0] px-4 py-3 text-center text-[#3b3226] shadow-[0_6px_16px_rgba(0,0,0,0.3)]">
          <p className={cn("font-black break-words", focusSizeClass(focus))}>
            <AutoFurigana text={focus} />
          </p>
          {rest && (
            <p className="mt-1 text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={rest} />
            </p>
          )}
        </div>
        <p className="h-6 text-center text-sm font-black text-[#ffd24d]" aria-live="polite">
          {state.hitMs > 0 ? "ぶつかった！" : state.combo >= 2 ? `${state.combo}コンボ！` : ""}
        </p>

        <div
          className="relative flex-1 overflow-hidden rounded-3xl"
          style={{
            backgroundColor: "#0b1030",
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #fff 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1.5px), radial-gradient(circle at 45% 85%, #cfe8ff 1.5px, transparent 2px), linear-gradient(to bottom, #0b1030, #25236b)",
            backgroundSize: "90px 110px, 130px 150px, 170px 190px, 100% 100%",
            backgroundPosition: `0 ${state.progress * 120}px, 0 ${state.progress * 90}px, 0 ${state.progress * 60}px, 0 0`,
          }}
        >
          <div className="absolute inset-0 flex">
            {Array.from({ length: lanes }, (_, lane) => (
              <button
                key={lane}
                type="button"
                aria-label={`${lane + 1}列目へ動く`}
                onClick={() => goTo(lane)}
                className={cn("h-full flex-1", lane > 0 && "border-l-2 border-dashed border-white/25")}
              />
            ))}
          </div>

          {/* 隕石と星 */}
          {state.items
            .filter((item) => !item.done)
            .map((item, index) => {
              const factor = itemFactor(state.progress, item.at, TRAVEL);
              if (!isVisible(factor)) return null;
              const height = item.kind === "meteor" ? METEOR_PX : STAR_PX;

              return (
                <div
                  key={`${item.kind}-${item.lane}-${item.at}-${index}`}
                  className="pointer-events-none absolute flex justify-center"
                  style={{ left: `${item.lane * laneWidth}%`, width: `${laneWidth}%`, top: topOf(factor, height), height }}
                >
                  {item.kind === "meteor" ? <MeteorArt size={height} /> : <StarArt size={height} />}
                </div>
              );
            })}

          {/* 答えの門 */}
          {isVisible(gateFactor) && (
            <div className="pointer-events-none absolute right-0 left-0 flex gap-2 px-2" style={{ top: topOf(gateFactor, GATE_PX), height: GATE_PX }}>
              {question.choices.map((choice, lane) => (
                <div
                  key={choice.id}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center rounded-t-full rounded-b-xl px-1 text-center font-black break-words text-[#3b3226] [word-break:auto-phrase]",
                    laneTextClass(lanes),
                    GATE_CLASS[gateLook(state, lane)],
                  )}
                >
                  {choice.image ? (
                    <span className="relative block h-14 w-full">
                      <Image src={choice.image} alt={choice.label} fill sizes="96px" className="object-contain" />
                    </span>
                  ) : (
                    <AutoFurigana text={choice.label} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ロケットのスプル */}
          <div
            className="pointer-events-none absolute bottom-0 flex justify-center transition-[left] duration-150"
            style={{ left: `${state.lane * laneWidth}%`, width: `${laneWidth}%`, height: ROCKET_PX }}
          >
            <div className={cn("relative h-full", state.hitMs > 0 && "animate-catch-shake")}>
              <Image
                src={rocket.src}
                alt="ロケットのスプル"
                width={Math.round(((ROCKET_PX - 14) * rocket.width) / rocket.height)}
                height={ROCKET_PX - 14}
                className="h-[calc(100%-14px)] w-auto"
                loading="eager"
              />
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[16px] border-x-transparent border-t-[#ff9f2e]"
              />
            </div>
          </div>

          {countdown > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b1030]/50">
              <p key={countdown} className="animate-pop-in text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                {countdown}
              </p>
              <p className="mt-2 rounded-full bg-white/85 px-4 py-1 text-base font-black text-[#3b3226]">
                <AutoFurigana text={SPACE_MOVE_HINT} />
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <AppButton variant="default" aria-label="左に動く" onClick={() => step(-1)} className="h-16 text-2xl">
            ◀
          </AppButton>
          <AppButton variant="default" aria-label="右に動く" onClick={() => step(1)} className="h-16 text-2xl">
            ▶
          </AppButton>
        </div>
      </div>

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.6)] px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="space-quit-title"
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center text-[#3b3226]"
          >
            <p id="space-quit-title" className="text-base font-black">
              <AutoFurigana text="やめる？ここまでの答えは残らないよ" />
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

/** 仮の隕石(丸い岩。絵が届いたら差し替え) */
function MeteorArt({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" role="img" aria-label="隕石" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
      <circle cx="22" cy="22" r="20" fill="#9a8570" />
      <circle cx="22" cy="22" r="20" fill="none" stroke="#6f5d4b" strokeWidth="2" />
      <circle cx="15" cy="16" r="4" fill="#7a6857" />
      <circle cx="29" cy="26" r="5" fill="#7a6857" />
      <circle cx="18" cy="30" r="3" fill="#7a6857" />
    </svg>
  );
}

/** 仮の星(黄色い星。絵が届いたら差し替え) */
function StarArt({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="星" className="drop-shadow-[0_0_6px_rgba(255,210,77,0.9)]">
      <polygon points="12,1.5 15,8.5 22.5,9.2 16.8,14 18.6,21.5 12,17.6 5.4,21.5 7.2,14 1.5,9.2 9,8.5" fill="#ffd24d" stroke="#e0a41a" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
