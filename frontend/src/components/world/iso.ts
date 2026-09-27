// マス目(x,y) ↔ SVG座標の変換。菱形1マス = 幅64・高さ32(2:1のアイソメ)
export const HALF_W = 32;
export const HALF_H = 16;
export const LAND_THICKNESS = 40;

export type ViewBox = { x: number; y: number; width: number; height: number };

export function tileCenter(x: number, y: number): { sx: number; sy: number } {
  return { sx: (x - y) * HALF_W, sy: (x + y) * HALF_H + HALF_H };
}

export function tilePoints(x: number, y: number): string {
  const { sx, sy } = tileCenter(x, y);
  return `${sx},${sy - HALF_H} ${sx + HALF_W},${sy} ${sx},${sy + HALF_H} ${sx - HALF_W},${sy}`;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

// 地図全体(横 width × 縦 height マス)を描く範囲。上は奥の目印・アイテムが伸びる分、下は土地の厚みの分をあける
export function sceneViewBox(width: number, height: number): ViewBox {
  const top = -84;
  const bottom = (width + height) * HALF_H + LAND_THICKNESS + 24;
  return { x: -height * HALF_W - 16, y: top, width: (width + height) * HALF_W + 32, height: bottom - top };
}

export function toPercent(sx: number, sy: number, vb: ViewBox): { left: number; top: number } {
  return {
    left: ((sx - vb.x) / vb.width) * 100,
    top: ((sy - vb.y) / vb.height) * 100,
  };
}
