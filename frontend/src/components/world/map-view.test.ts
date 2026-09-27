import { describe, expect, it } from "vitest";

import { sceneViewBox } from "./iso";
import { homePlot, isAwayFromHome, isDragMove, mapLayout, plotViewBox, scrollForPlot } from "./map-view";
import type { WorldPlot } from "./types";

const plot = (key: string, x: number, y: number, w: number, h: number, minLevel: number): WorldPlot => ({
  key,
  name: key,
  x,
  y,
  w,
  h,
  min_level: minLevel,
  ground: "grass",
  unlocked: minLevel === 1,
});
const TOWN = plot("town", 0, 0, 7, 7, 1);
const BAMBOO = plot("bamboo", 7, 0, 5, 7, 4);
const BEACH = plot("beach", 0, 7, 7, 5, 7);
const HILL = plot("hill", 7, 7, 5, 5, 10);
const LAND = { width: 12, height: 12, plots: [BAMBOO, TOWN, BEACH, HILL] };

describe("ドラッグの判定", () => {
  it("6px以上動いたらドラッグ", () => {
    expect(isDragMove(3, 4)).toBe(false);
    expect(isDragMove(0, 6)).toBe(true);
    expect(isDragMove(-5, -4)).toBe(true);
  });
});

describe("地図の範囲", () => {
  it("7×7はE回より前の町の絵と同じ範囲、12×12は地図全体", () => {
    expect(sceneViewBox(7, 7)).toEqual({ x: -240, y: -84, width: 480, height: 372 });
    expect(sceneViewBox(12, 12)).toEqual({ x: -400, y: -84, width: 800, height: 532 });
  });

  it("最初から開いている区画は町", () => {
    expect(homePlot(LAND).key).toBe("town");
  });

  it("区画だけの範囲は、区画の位置の分ずらす", () => {
    expect(plotViewBox(TOWN)).toEqual(sceneViewBox(7, 7));
    expect(plotViewBox(BAMBOO)).toEqual({ x: -16, y: 28, width: 416, height: 340 });
  });

  it("町が枠の横幅に収まる縮尺にする", () => {
    expect(mapLayout(LAND, 480)).toEqual({ map: sceneViewBox(12, 12), scale: 1, width: 800, height: 532, viewHeight: 372 });
    expect(mapLayout(LAND, 360)).toMatchObject({ scale: 0.75, width: 600, viewHeight: 279 });
  });
});

describe("スクロール位置", () => {
  const layout = mapLayout(LAND, 480);

  it("町を開いたときは、E回より前と同じく町が枠にちょうど収まる", () => {
    expect(scrollForPlot(TOWN, layout, 480)).toEqual({ left: 160, top: 0 });
  });

  it("区画の真ん中を枠の真ん中に出し、地図の外にははみ出さない", () => {
    expect(scrollForPlot(HILL, layout, 480)).toEqual({ left: 160, top: 160 });
    expect(scrollForPlot(BEACH, layout, 480)).toEqual({ left: 0, top: 96 });
  });

  it("最初の位置から枠の4分の1より離れたら「スプルの家へ戻る」を出す", () => {
    const home = { left: 160, top: 0 };
    expect(isAwayFromHome({ left: 160, top: 0 }, home, 480, 372)).toBe(false);
    expect(isAwayFromHome({ left: 260, top: 0 }, home, 480, 372)).toBe(false);
    expect(isAwayFromHome({ left: 281, top: 0 }, home, 480, 372)).toBe(true);
    expect(isAwayFromHome({ left: 160, top: 94 }, home, 480, 372)).toBe(true);
  });
});
