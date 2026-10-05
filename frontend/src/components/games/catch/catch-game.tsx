"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { splitPrompt, type GameQuestion } from "@/components/games/game-question";
import { GROWTH_IMAGES, OUTING_IMAGES, SPRU_IMAGES, type SpruImage } from "@/components/spru/spru-assets";
import { cn } from "@/lib/utils";

import {
  CATCH_HEARTS,
  createCatchGame,
  growthStage,
  moveBy,
  throwAt,
  tick,
  type CatchSettings,
  type CatchState,
} from "./catch-engine";
import {
  CATCH_MOVE_HINT,
  CATCH_TAP_HINT,
  cardLook,
  focusSizeClass,
  growthImage,
  laneTextClass,
  spruPose,
  type CardLook,
  type SpruPose,
} from "./catch-view";

/** 落ちてくる言葉のカードの高さ・上のすきま・スプルの高さ(px)。受け取る線はスプルの頭 */
const CARD_PX = 64;
const ROW_TOP_PX = 8;
const SPRU_PX = 96;
const FALL_OFFSET_PX = ROW_TOP_PX + CARD_PX + SPRU_PX;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;

const CARD_CLASS: Record<CardLook, string> = {
  normal: "bg-[#fffaf0]",
  "caught-correct": "animate-pop-in bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  "caught-wrong": "animate-catch-shake bg-[#ffd9cc] ring-4 ring-[#f28b6d]",
  answer: "bg-[#dff5d3] ring-4 ring-[#5bb33e]",
  faded: "bg-[#fffaf0] opacity-40",
};

const POSE_IMAGE: Record<SpruPose, SpruImage> = {
  back: OUTING_IMAGES.back,
  throw: SPRU_IMAGES["sow-fly"],
  cheer: SPRU_IMAGES.cheer,
  sad: SPRU_IMAGES.sad,
};

/** スプルから言葉へ飛ぶ種(見た目だけ)。位置は、場の左上からのpx */
type SeedFlight = { key: number; from: { x: number; y: number }; to: { x: number; y: number } };

/** スプルキャッチのゲームの画面(docs/design/2026-09-29-spru-catch-design.md 7-3・7-5) */
export function CatchGame({
  questions,
  settings,
  onFinish,
  onQuit,
}: {
  questions: GameQuestion[];
  settings: CatchSettings;
  onFinish: (state: CatchState) => void;
  onQuit: () => void;
}) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createCatchGame(questions, settings));
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const pausedRef = useRef(true);
  const finishedRef = useRef(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const spruRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(state);
  const seedKey = useRef(0);
  const [seed, setSeed] = useState<SeedFlight | null>(null);

  useEffect(() => {
    latestRef.current = state;
  }, [state]);

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

  // 受け取ったときの音
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

  /** 落ちている言葉をタップして、スプルが種を投げて答える。種の動きは見た目だけで、出せなくても答えは決まる */
  const throwSeed = (lane: number) => {
    if (pausedRef.current || latestRef.current.phase !== "falling") return;

    const arena = arenaRef.current?.getBoundingClientRect();
    const card = arenaRef.current?.querySelector<HTMLElement>(`[data-lane="${lane}"]`)?.getBoundingClientRect();
    const spruBox = spruRef.current?.getBoundingClientRect();
    if (arena && card && spruBox) {
      setSeed({
        key: ++seedKey.current,
        from: { x: spruBox.left - arena.left + spruBox.width / 2, y: spruBox.top - arena.top },
        to: { x: card.left - arena.left + card.width / 2, y: card.top - arena.top + card.height / 2 },
      });
    }
    setState((current) => throwAt(current, lane));
  };
  const step = (direction: -1 | 1) => {
    if (pausedRef.current) return;
    setState((current) => moveBy(current, direction));
  };

  const question = state.questions[Math.min(state.index, state.questions.length - 1)];
  const { focus, rest } = splitPrompt(question.prompt);
  const lanes = state.settings.lanes;
  const laneWidth = 100 / lanes;
  const spru = POSE_IMAGE[spruPose(state)];
  const growth = growthImage(growthStage(state.bestCombo));

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-[#8fd4e9]">
      <div className="flex h-full w-full max-w-md flex-col px-3 pt-3 pb-4">
        <div className="flex items-center justify-between gap-2 text-[#3b3226]">
          <AppButton variant="default" size="sm" onClick={() => setConfirmQuit(true)}>
            やめる
          </AppButton>
          <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-black">
            {state.index + 1}/{state.questions.length}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-black">{state.score}点</span>
          <span aria-label={`ハート${state.hearts}つ`} className="rounded-full bg-white/85 px-3 py-1 text-sm">
            {Array.from({ length: CATCH_HEARTS }, (_, i) => (
              <span key={i} aria-hidden className={i < state.hearts ? "text-[#e0457b]" : "text-[#e0457b] opacity-25"}>
                ♥
              </span>
            ))}
          </span>
        </div>

        <div className="mt-3 rounded-3xl bg-[#fffaf0] px-4 py-3 text-center text-[#3b3226] shadow-[0_6px_16px_rgba(40,70,90,0.16)]">
          <p className={cn("font-black break-words", focusSizeClass(focus))}>
            <AutoFurigana text={focus} />
          </p>
          {rest && (
            <p className="mt-1 text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={rest} />
            </p>
          )}
        </div>
        <p className="h-6 text-center text-sm font-black text-[#c98f12]" aria-live="polite">
          {state.combo >= 2 ? `${state.combo}コンボ！` : ""}
        </p>

        <div ref={arenaRef} className="relative flex-1 overflow-hidden rounded-3xl bg-gradient-to-b from-[#bfe6f5] via-[#d9f0c8] to-[#9fd67f]">
          <div className="absolute inset-0 flex">
            {Array.from({ length: lanes }, (_, lane) => (
              <button
                key={lane}
                type="button"
                aria-label={`${lane + 1}列目の言葉で答える`}
                onClick={() => throwSeed(lane)}
                className={cn("h-full flex-1", lane > 0 && "border-l-2 border-dashed border-white/70")}
              />
            ))}
          </div>

          <Image
            src={growth.src}
            alt=""
            width={Math.round((40 * growth.width) / growth.height)}
            height={40}
            className="pointer-events-none absolute top-2 right-2 h-10 w-auto"
          />

          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: `translateY(calc(${state.progress * 100}% - ${state.progress * FALL_OFFSET_PX}px))` }}
          >
            <div className="flex gap-2 px-2" style={{ paddingTop: ROW_TOP_PX }}>
              {question.choices.map((choice, lane) => (
                <div
                  key={choice.id}
                  data-lane={lane}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center rounded-2xl px-1 text-center font-black break-words text-[#3b3226] shadow-[0_4px_10px_rgba(40,70,90,0.18)] [word-break:auto-phrase]",
                    laneTextClass(lanes),
                    CARD_CLASS[cardLook(state, lane)],
                  )}
                  style={{ height: CARD_PX }}
                >
                  {choice.image ? (
                    <span className="relative block h-12 w-full">
                      <Image src={choice.image} alt={choice.label} fill sizes="96px" className="object-contain" />
                    </span>
                  ) : (
                    <AutoFurigana text={choice.label} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            ref={spruRef}
            className="pointer-events-none absolute bottom-0 flex justify-center transition-[left] duration-150"
            style={{ left: `${state.lane * laneWidth}%`, width: `${laneWidth}%`, height: SPRU_PX }}
          >
            <Image
              src={spru.src}
              alt="スプル"
              width={Math.round((SPRU_PX * spru.width) / spru.height)}
              height={SPRU_PX}
              className="h-full w-auto"
              loading="eager"
            />
          </div>

          {seed && <SeedFlightView key={seed.key} flight={seed} onDone={() => setSeed(null)} />}

          {countdown > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30">
              <p key={countdown} className="animate-pop-in text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(40,70,90,0.4)]">
                {countdown}
              </p>
              <p className="mt-2 rounded-full bg-white/80 px-4 py-1 text-base font-black text-[#3b3226]">
                <AutoFurigana text={CATCH_TAP_HINT} />
              </p>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-xs font-bold text-[#3b3226]/80">
          <AutoFurigana text={CATCH_MOVE_HINT} />
        </p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <AppButton variant="default" aria-label="左に動く" onClick={() => step(-1)} className="h-16 text-2xl">
            ◀
          </AppButton>
          <AppButton variant="default" aria-label="右に動く" onClick={() => step(1)} className="h-16 text-2xl">
            ▶
          </AppButton>
        </div>
      </div>

      {confirmQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="catch-quit-title"
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center text-[#3b3226]"
          >
            <p id="catch-quit-title" className="text-base font-black">
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

const SEED_PX = 28;
const SEED_MS = 280;

/**
 * スプルから言葉へ飛ぶ種。動きだけの部品(見た目のみ)。ゲームの画面は毎フレーム描き直されるので、
 * 終わったときの呼び出しは ref に持ち、タイマーを作り直さない
 */
function SeedFlightView({ flight, onDone }: { flight: SeedFlight; onDone: () => void }) {
  const [go, setGo] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGo(true));
    const done = setTimeout(() => doneRef.current(), SEED_MS + 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, []);

  const point = go ? flight.to : flight.from;
  const image = GROWTH_IMAGES["spru/seed"];

  return (
    <Image
      src={image.src}
      alt=""
      width={SEED_PX}
      height={Math.round((SEED_PX * image.height) / image.width)}
      className="pointer-events-none absolute z-10"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${point.x - SEED_PX / 2}px, ${point.y - SEED_PX / 2}px)`,
        transition: `transform ${SEED_MS}ms ease-out`,
      }}
    />
  );
}
