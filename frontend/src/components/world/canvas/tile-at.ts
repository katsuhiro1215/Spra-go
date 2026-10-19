import type { Tile } from "../types";
import type { ViewBox } from "../iso";

/**
 * 画面の座標 → マス(iso.ts の tileCenter の逆。docs/design/2026-10-19-town-roads-design.md 5-1)。
 * rect は Canvas が画面で占める四角(getBoundingClientRect)、vb は Canvas が描く地図の範囲(sceneViewBox)。
 * 地図の外は、範囲外のマス番号になる(呼ぶ側が外かを判断する)
 */
export function tileAt(
  point: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  vb: ViewBox,
): Tile {
  const sx = vb.x + ((point.x - rect.left) / rect.width) * vb.width;
  const sy = vb.y + ((point.y - rect.top) / rect.height) * vb.height;
  // マスの角の座標(u, v)。マス(x, y)は u∈[x, x+1)・v∈[y, y+1)
  const u = (sx / 32 + sy / 16) / 2;
  const v = (sy / 16 - sx / 32) / 2;
  return [Math.floor(u), Math.floor(v)];
}
