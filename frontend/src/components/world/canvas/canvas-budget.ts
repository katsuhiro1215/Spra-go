/**
 * Canvasの大きさの予算(docs/design/2026-10-19-town-land-design.md 5章)。
 * 地図が広いほど、1枚のCanvasが大きくなり、層が3枚あるので、メモリを多く使う。
 * 画面の密度は、ふつうは2倍まで、地図が広いとき(32×32など)は1.5倍まで。幅は4096pxまで
 */
export const MAX_DPR = 2;
export const MAX_DPR_LARGE = 1.5;
export const MAX_WIDTH_PX = 4096;
/** 地図の幅(SVGの単位)がこれをこえたら、大きい地図(17×17で約1,100、32×32で約2,100) */
export const LARGE_MAP_WIDTH = 1500;

export function canvasDpr(deviceDpr: number, mapWidth: number): number {
  return Math.min(deviceDpr || 1, mapWidth > LARGE_MAP_WIDTH ? MAX_DPR_LARGE : MAX_DPR);
}

/** Canvasの幅(px)。表示の幅 × 密度、上限あり */
export function canvasWidthPx(cssWidth: number, dpr: number): number {
  return Math.min(Math.round(cssWidth * dpr), MAX_WIDTH_PX);
}
