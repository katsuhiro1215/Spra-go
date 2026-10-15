import { INVINCIBLE_MS, WORLD_W, type RunState } from "./run-engine";

/**
 * スプルランの描くための計算(docs/design/2026-10-22-spru-run-design.md 5章)。
 * 場面は画面いっぱい。ゲームの中の大きさ・横の位置は、場面の横幅の割合(cqw)で描く(横 WORLD_W が場面の横幅)。
 * 高さは、地面の上の線(場面の下から GROUND_CQH %)からの位置にする。縦に長い画面ほど、空が広くなる
 */
export const GROUND_CQH = 22;

/** ゲームの中の長さを、場面の横幅の割合にする */
export function sizeCqw(n: number): string {
  return `${(n / WORLD_W) * 100}cqw`;
}

/** 地面からの高さ y を、場面の下からの位置にする */
export function bottomCss(y: number): string {
  return `calc(${GROUND_CQH}cqh + ${sizeCqw(y)})`;
}

/** 背景の流れ。factor は奥行き(1 が地面と同じ速さ)。場面の幅の割合(cqw)で返す */
export function scrollCqw(distance: number, factor: number): string {
  return `${-((distance * factor) / WORLD_W) * 100}cqw`;
}

export type SpruPose = "run" | "walk" | "jump" | "startled";

/** スプルの絵: 空中はジャンプ、ぶつかった直後はびっくり、走るときは2枚を交互に */
export function spruPose(state: RunState): SpruPose {
  if (state.invincibleMs > INVINCIBLE_MS - 400) return "startled";
  if (state.y > 0) return "jump";
  return Math.floor(state.distance / 36) % 2 === 0 ? "run" : "walk";
}

/** ぶつかったあとの点滅(消えている時) */
export function isBlinkOff(state: RunState): boolean {
  return state.invincibleMs > 0 && Math.floor(state.invincibleMs / 120) % 2 === 1;
}

export const RUN_HINT = "タップでジャンプ！ 空中でもう1回タップで2だんジャンプ";
