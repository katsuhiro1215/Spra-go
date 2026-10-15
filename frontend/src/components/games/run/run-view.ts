import { GROUND_H, INVINCIBLE_MS, WORLD_H, WORLD_W, type RunState } from "./run-engine";

/** スプルランの描くための計算(docs/design/2026-10-22-spru-run-design.md 5章)。ゲームの中の広さを、場面の % にする */

/** 画面の左からの位置(%) */
export function leftPct(screenX: number): string {
  return `${(screenX / WORLD_W) * 100}%`;
}

/** 地面からの高さ y を、場面の下からの位置(%)にする */
export function bottomPct(y: number): string {
  return `${((GROUND_H + y) / WORLD_H) * 100}%`;
}

export function widthPct(w: number): string {
  return `${(w / WORLD_W) * 100}%`;
}

export function heightPct(h: number): string {
  return `${(h / WORLD_H) * 100}%`;
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
