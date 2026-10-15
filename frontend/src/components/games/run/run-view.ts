import { RUN_ASSETS } from "./run-assets";
import { INVINCIBLE_MS, WORLD_W, type Obstacle, type ObstacleKind, type RunState } from "./run-engine";

/**
 * スプルランの描くための計算(docs/design/2026-10-22-spru-run-design.md 5章)。
 * 場面は画面いっぱい。ゲームの中の大きさ・横の位置は、場面の横幅の割合(cqw)で描く(横 WORLD_W が場面の横幅)。
 * 高さは、地面の上の線(場面の下から GROUND_CQH %)からの位置にする。縦に長い画面ほど、空が広くなる
 */
export const GROUND_CQH = 18;

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

export type SpruPose = "run-a" | "run-b" | "jump" | "double-jump" | "hit";

/** スプルの絵: ぶつかった直後はびっくり、空中はジャンプ(2段目は丸まる)、走るときは2枚を交互に */
export function spruPose(state: RunState): SpruPose {
  if (state.invincibleMs > INVINCIBLE_MS - 400) return "hit";
  if (state.y > 0) return state.jumps >= 2 ? "double-jump" : "jump";
  return Math.floor(state.distance / 36) % 2 === 0 ? "run-a" : "run-b";
}

/** スプルの絵の大きさ(ゲームの中の広さ)。走る1枚目を runHeight の高さにし、ほかのポーズも同じ倍率にする */
export function spruDraw(pose: SpruPose, runHeight: number): { src: string; width: number; height: number } {
  const asset = RUN_ASSETS[pose];
  const scale = runHeight / RUN_ASSETS["run-a"].height;
  return { src: asset.src, width: asset.width * scale, height: asset.height * scale };
}

/** じゃまものの絵を、当たりの箱より少し大きく描く倍率。水たまりは平らなので、高さを決めて描く */
const OBSTACLE_DRAW_SCALE = 1.12;
const PUDDLE_DRAW_H = 16;

/** じゃまものの絵の位置と大きさ(ゲームの中の広さ。left はコースの上の位置)。当たりの箱の真ん中に、絵の形のまま描く */
export function obstacleDraw(obstacle: Obstacle): { src: string; left: number; width: number; height: number } {
  const asset = RUN_ASSETS[obstacle.kind satisfies ObstacleKind];
  const height = obstacle.kind === "puddle" ? PUDDLE_DRAW_H : obstacle.h * OBSTACLE_DRAW_SCALE;
  const width = (height * asset.width) / asset.height;
  return { src: asset.src, left: obstacle.x + obstacle.w / 2 - width / 2, width, height };
}

/** ぶつかったあとの点滅(消えている時) */
export function isBlinkOff(state: RunState): boolean {
  return state.invincibleMs > 0 && Math.floor(state.invincibleMs / 120) % 2 === 1;
}

export const RUN_HINT = "タップでジャンプ！ 空中でもう1回タップで2だんジャンプ";
