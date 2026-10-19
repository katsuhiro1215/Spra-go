import { describe, expect, it } from "vitest";

import { canvasDpr, canvasWidthPx, LARGE_MAP_WIDTH, MAX_WIDTH_PX } from "./canvas-budget";
import { sceneViewBox } from "../iso";

describe("Canvasの大きさの予算", () => {
  it("今の17×17は2倍まで、32×32は1.5倍まで", () => {
    expect(sceneViewBox(17, 17).width).toBeLessThan(LARGE_MAP_WIDTH);
    expect(sceneViewBox(32, 32).width).toBeGreaterThan(LARGE_MAP_WIDTH);
    expect(canvasDpr(3, sceneViewBox(17, 17).width)).toBe(2);
    expect(canvasDpr(3, sceneViewBox(32, 32).width)).toBe(1.5);
  });

  it("画面の密度が低ければ、そのまま。わからなければ1", () => {
    expect(canvasDpr(1, 3000)).toBe(1);
    expect(canvasDpr(0, 3000)).toBe(1);
  });

  it("幅は4096pxまで", () => {
    expect(canvasWidthPx(390 * 4.6, 1.5)).toBe(Math.round(390 * 4.6 * 1.5));
    expect(canvasWidthPx(5000, 2)).toBe(MAX_WIDTH_PX);
  });

  it("32×32の倍率1(スマホ幅390px・密度3)は、4096pxの中に収まる。倍率1.5でも、収まる", () => {
    // 町(7×7)が枠の幅に収まる倍率1のとき、地図の幅は 枠の幅 × (地図の単位 / 町の単位)
    const ratio = sceneViewBox(32, 32).width / sceneViewBox(7, 7).width;
    const dpr = canvasDpr(3, sceneViewBox(32, 32).width);
    expect(390 * ratio * dpr).toBeLessThan(MAX_WIDTH_PX);
    expect(390 * ratio * 1.5 * dpr).toBeLessThanOrEqual(MAX_WIDTH_PX + 200);
  });
});
