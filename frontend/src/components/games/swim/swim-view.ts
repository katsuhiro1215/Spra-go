import { SWIM_ASSETS } from "./swim-assets";
import { INVINCIBLE_MS, WORLD_W, type Obstacle, type SwimState } from "./swim-engine";

/**
 * スプラスイムの描くための計算(docs/design/2026-11-10-spru-swim-design.md)。
 * 場面は画面いっぱい。ゲームの中の大きさ・横の位置は、場面の横幅の割合(cqw)で描く(横 WORLD_W が場面の横幅)。
 * 高さは、海底(y=0)からの位置(場面の下から)にする。run-view.ts と同じ考え方(ただし地面の分の余白はない)
 */

/** ゲームの中の長さを、場面の横幅の割合にする */
export function sizeCqw(n: number): string {
  return `${(n / WORLD_W) * 100}cqw`;
}

/** 海底からの高さ y を、場面の下からの位置にする */
export function bottomCss(y: number): string {
  return sizeCqw(y);
}

/** 背景の流れ。factor は奥行き(1がいちばん手前)。場面の幅の割合(cqw)で返す */
export function scrollCqw(distance: number, factor: number): string {
  return `${-((distance * factor) / WORLD_W) * 100}cqw`;
}

export type SpruSwimPose = "swim-a" | "swim-b" | "rise" | "hit";

/** スプラの絵: ぶつかった直後はびっくり、タップした直後(上向きに速いとき)は上昇、それ以外は泳ぐ2枚を交互に */
export function spruPose(state: SwimState): SpruSwimPose {
  if (state.invincibleMs > INVINCIBLE_MS - 400) return "hit";
  if (state.vy > 50) return "rise";
  return Math.floor(state.distance / 30) % 2 === 0 ? "swim-a" : "swim-b";
}

/** スプラの絵の大きさ(ゲームの中の広さ)。swim-a を drawHeight の高さにし、ほかのポーズも同じ倍率にする */
export function spruDraw(pose: SpruSwimPose, drawHeight: number): { src: string; width: number; height: number } {
  const asset = SWIM_ASSETS[pose];
  const scale = drawHeight / SWIM_ASSETS["swim-a"].height;
  return { src: asset.src, width: asset.width * scale, height: asset.height * scale };
}

/** じゃまもの(海の生物)の絵を、当たりの大きさより少し大きく描く倍率 */
const OBSTACLE_DRAW_SCALE = 1.15;

/** じゃまものの絵の位置と大きさ(ゲームの中の広さ。left はコースの上の位置)。当たりの箱の真ん中に、絵の形のまま描く */
export function obstacleDraw(obstacle: Obstacle): { src: string; left: number; bottom: number; width: number; height: number } {
  const asset = SWIM_ASSETS[obstacle.kind];
  const height = obstacle.h * OBSTACLE_DRAW_SCALE;
  const width = (height * asset.width) / asset.height;
  return {
    src: asset.src,
    left: obstacle.x + obstacle.w / 2 - width / 2,
    bottom: obstacle.y + obstacle.h / 2 - height / 2,
    width,
    height,
  };
}

/** ぶつかったあとの点滅(消えている時) */
export function isBlinkOff(state: SwimState): boolean {
  return state.invincibleMs > 0 && Math.floor(state.invincibleMs / 120) % 2 === 1;
}

export const SWIM_HINT = "タップでうく！ なにもしないと しずむよ";
