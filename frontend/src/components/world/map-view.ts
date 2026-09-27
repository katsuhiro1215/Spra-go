import { HALF_H, HALF_W, sceneViewBox, type ViewBox } from "./iso";
import type { WorldLand, WorldPlot } from "./types";

type Rect = Pick<WorldPlot, "x" | "y" | "w" | "h">;
type Scroll = { left: number; top: number };

// マウスでこれ以上動かしたらドラッグとみなし、離したときのタップを起こさない(設計書3-3)
export const DRAG_THRESHOLD = 6;

/** map は地図全体のSVGの範囲、scale はSVGの1単位のpx、width・height は地図全体のpx、viewHeight は枠の高さのpx */
export type MapLayout = { map: ViewBox; scale: number; width: number; height: number; viewHeight: number };

export function isDragMove(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD;
}

/** 最初から開いている区画(町) */
export function homePlot(land: Pick<WorldLand, "plots">): WorldPlot {
  return land.plots.reduce((a, b) => (b.min_level < a.min_level ? b : a));
}

/** 区画だけを描いたときの範囲(E回より前の町の絵と同じ余白) */
export function plotViewBox(plot: Rect): ViewBox {
  const box = sceneViewBox(plot.w, plot.h);
  return { ...box, x: box.x + (plot.x - plot.y) * HALF_W, y: box.y + (plot.x + plot.y) * HALF_H };
}

/** 町が枠の横幅にちょうど収まる縮尺で、地図全体の大きさと枠の高さを出す(設計書3-3) */
export function mapLayout(land: Pick<WorldLand, "width" | "height" | "plots">, viewWidth: number): MapLayout {
  const home = plotViewBox(homePlot(land));
  const map = sceneViewBox(land.width, land.height);
  const scale = viewWidth / home.width;
  return { map, scale, width: map.width * scale, height: map.height * scale, viewHeight: home.height * scale };
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));

/** 区画の真ん中を枠の真ん中に出すスクロール位置(地図の外にははみ出さない) */
export function scrollForPlot(plot: Rect, layout: MapLayout, viewWidth: number): Scroll {
  const box = plotViewBox(plot);
  const left = (box.x + box.width / 2 - layout.map.x) * layout.scale - viewWidth / 2;
  const top = (box.y + box.height / 2 - layout.map.y) * layout.scale - layout.viewHeight / 2;
  return { left: clamp(left, layout.width - viewWidth), top: clamp(top, layout.height - layout.viewHeight) };
}

/** 最初の位置(町が枠に収まる位置)から、枠の幅か高さの4分の1より離れたか(「スプルの家へ戻る」を出す) */
export function isAwayFromHome(scroll: Scroll, home: Scroll, viewWidth: number, viewHeight: number): boolean {
  return Math.abs(scroll.left - home.left) > viewWidth / 4 || Math.abs(scroll.top - home.top) > viewHeight / 4;
}
