"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
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
  WORLD_W,
  type RunState,
} from "./run-engine";
import { PLATFORM_ART, RUN_ASSETS } from "./run-assets";
import { quitMessage, type RunMode } from "./run-flow";
import { bottomCss, GROUND_CQH, isBlinkOff, obstacleDraw, platformDraw, RUN_HINT, scrollCqw, sizeCqw, spruDraw, spruPose } from "./run-view";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
/** スプルの絵の大きさ(走る1枚目の高さ。ゲームの中の広さ。当たりの箱より大きく描く) */
const SPRU_DRAW_H = 80;
/** タネの絵の高さ(当たりの円より少し大きく描く) */
const SEED_DRAW_H = SEED_R * 2.6;
/** 地面の絵の、草の線(スプルが立つ所)の位置。絵の上からの割合 */
const GROUND_LINE = 0.22;
/** 地面・草はら・山の絵の高さ(場面の横幅に合わせたとき。cqw) */
const groundCqw = (100 * RUN_ASSETS["bg-ground"].height) / RUN_ASSETS["bg-ground"].width;
const layerCqw = (100 * RUN_ASSETS["bg-meadow"].height) / RUN_ASSETS["bg-meadow"].width;

/** この画面で、床・空のタネを置ける高さ(ゲームの中の広さ)。画面の高さから、地面の分と、上の表示(約130px)を引く。縦に長いほど、高い床まで積む */
function ceilingForScreen(): number {
  const scale = Math.min(window.innerWidth, 448) / WORLD_W;
  return Math.max(300, Math.min(640, (window.innerHeight * (1 - GROUND_CQH / 100) - 130) / scale));
}

/** スプルランのゲームの画面(docs/design/2026-10-22-spru-run-design.md 5章)。絵は tools/spru-run/build_assets.py が作る */
export function RunGame({
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
  mode: RunMode;
  onFinish: (state: RunState) => void;
  /** やめる。そこまでの状態と、始めてからの時間(ミリ秒)を渡す */
  onQuit: (state: RunState, sinceStartMs: number) => void;
}) {
  const { play: playSound } = useSound();
  const [state, setState] = useState(() => createRun(seed, startMs, ceiling ?? ceilingForScreen()));
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

  const spru = spruDraw(spruPose(state), SPRU_DRAW_H);
  const scroll = (factor: number): CSSProperties["backgroundPositionX"] => (calm && factor < 1 ? 0 : scrollCqw(state.distance, factor));

  return (
    <div className="fixed inset-0 z-40 flex touch-none justify-center bg-[#8fd3ff] select-none" onPointerDown={onTap}>
      {/* 場面(画面いっぱい。大きさは横幅の割合、高さは地面からの位置) */}
      <div
        className="relative h-full w-full max-w-md overflow-hidden bg-[#6ebef5] bg-cover bg-top [container-type:size]"
        style={{ backgroundImage: `url(${RUN_ASSETS["bg-sky"].src})` }}
      >
        {/* 遠くの山・近くの草はら(下の方は、地面の後ろにかくれる) */}
        {(
          [
            ["bg-hills", 0.15, 9],
            ["bg-meadow", 0.45, 0],
          ] as const
        ).map(([key, factor, raise]) => (
          <div
            key={key}
            aria-hidden
            className="absolute inset-x-0 bg-repeat-x"
            style={{
              bottom: `calc(${GROUND_CQH}cqh + ${raise}cqw)`,
              height: `${layerCqw}cqw`,
              backgroundImage: `url(${RUN_ASSETS[key].src})`,
              backgroundSize: "100cqw 100%",
              backgroundPositionX: scroll(factor),
            }}
          />
        ))}
        {/* 地面(草の線が、スプルの足もと) */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-[#b96930] bg-repeat-x"
          style={{
            height: `calc(${GROUND_CQH}cqh + ${groundCqw * GROUND_LINE}cqw)`,
            backgroundImage: `url(${RUN_ASSETS["bg-ground"].src})`,
            backgroundSize: `100cqw ${groundCqw}cqw`,
            backgroundPositionX: scroll(1),
          }}
        />

        {/* タネ */}
        {state.seeds
          .filter((seed) => !seed.taken)
          .map((seed) => {
            const asset = RUN_ASSETS[seed.golden ? "golden-seed" : seed.silver ? "silver-seed" : "seed"];
            const width = (SEED_DRAW_H * asset.width) / asset.height;
            return (
              <div
                key={`s-${seed.x}-${seed.y}`}
                className="pointer-events-none absolute"
                style={{
                  left: sizeCqw(seed.x - state.distance - width / 2),
                  bottom: bottomCss(seed.y - SEED_DRAW_H / 2),
                  width: sizeCqw(width),
                  height: sizeCqw(SEED_DRAW_H),
                }}
              >
                <Image src={asset.src} alt={seed.golden ? "金のタネ" : seed.silver ? "銀のタネ" : "タネ"} fill sizes="40px" unoptimized className="object-contain" />
              </div>
            );
          })}

        {/* 床(左のはし・まんなか(横にのばす)・右のはし) */}
        {state.platforms.map((p) => {
          const draw = platformDraw(p);
          const src = PLATFORM_ART[draw.art].src;
          const part = (suffix: "l" | "m" | "r") => ({ backgroundImage: `url(${src}-${suffix}.webp)`, backgroundSize: "100% 100%" });
          return (
            <div
              key={`p-${p.x}`}
              aria-hidden
              className="pointer-events-none absolute flex"
              style={{ left: sizeCqw(p.x - state.distance), bottom: bottomCss(draw.bottom), width: sizeCqw(p.w), height: sizeCqw(draw.height) }}
            >
              <div className="h-full shrink-0" style={{ width: sizeCqw(draw.cap), ...part("l") }} />
              <div className="h-full flex-1" style={part("m")} />
              <div className="h-full shrink-0" style={{ width: sizeCqw(draw.cap), ...part("r") }} />
            </div>
          );
        })}

        {/* じゃまもの */}
        {state.obstacles.map((o) => {
          const art = obstacleDraw(o);
          // ハチは、ふわふわ上下に動いて見える(当たりは動かない)
          const bob = o.kind === "bee" ? Math.sin(state.elapsedMs / 180 + o.x) * 3 : 0;
          const lift = (o.base ?? 0) + (o.kind === "puddle" ? -art.height / 2 : o.base ? 0 : -3) + bob;
          return (
            <div
              key={`o-${o.x}`}
              className={cn("pointer-events-none absolute", o.hit && "opacity-60")}
              style={{ left: sizeCqw(art.left - state.distance), bottom: bottomCss(lift), width: sizeCqw(art.width), height: sizeCqw(art.height) }}
            >
              <Image src={art.src} alt="" fill sizes="120px" unoptimized className="object-contain object-bottom" />
            </div>
          );
        })}

        {/* スプル */}
        <div
          className={cn("pointer-events-none absolute", isBlinkOff(state) && "opacity-30")}
          style={{
            left: sizeCqw(SPRU_X + SPRU_W / 2 - spru.width / 2),
            bottom: bottomCss(state.y - 3),
            width: sizeCqw(spru.width),
            height: sizeCqw(spru.height),
          }}
        >
          <Image src={spru.src} alt="スプル" fill sizes="90px" unoptimized className="object-contain object-bottom" loading="eager" />
        </div>

        {/* 上の表示(場面に重ねる) */}
        <div className="absolute inset-x-0 top-0 px-3 pt-3 text-[#3b3226]">
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
          <p className="mt-3 text-center text-3xl font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">{currentScore(state)}点</p>
          {mode === "practice" && (
            <p className="mt-1 text-center">
              <span className="rounded-full bg-white/90 px-3 py-0.5 text-xs font-black text-[#7a5a12]">
                <AutoFurigana text="練習中（タネは出ないよ）" />
              </span>
            </p>
          )}
        </div>

        {countdown > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30">
            <p key={countdown} className="animate-pop-in text-8xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
              {countdown}
            </p>
            <p className="mx-6 mt-3 rounded-2xl bg-white/90 px-4 py-2 text-center text-base font-black text-[#3b3226]">
              <AutoFurigana text={RUN_HINT} />
            </p>
          </div>
        )}
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
