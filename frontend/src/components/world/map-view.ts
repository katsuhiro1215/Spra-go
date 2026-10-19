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
export function mapLayout(land: Pick<WorldLand, "width" | "height" | "plots">, viewWidth: number, zoom = 1): MapLayout {
  const home = plotViewBox(homePlot(land));
  const map = sceneViewBox(land.width, land.height);
  const base = viewWidth / home.width;
  const scale = base * zoom;
  // 枠の高さは倍率によらず一定(町が枠に収まる大きさのときの高さ)
  return { map, scale, width: map.width * scale, height: map.height * scale, viewHeight: home.height * base };
}

/** 拡大・縮小の倍率(1が、町が枠の横幅に収まる今の大きさ。0.2で、32×32の全部の土地が1画面に入る) */
export const ZOOM_STEPS = [0.2, 0.35, 0.6, 1, 1.5];

export function nextZoom(zoom: number, direction: "in" | "out"): number {
  const i = ZOOM_STEPS.indexOf(zoom);
  const at = i === -1 ? ZOOM_STEPS.indexOf(1) : i;
  return ZOOM_STEPS[Math.min(Math.max(at + (direction === "in" ? 1 : -1), 0), ZOOM_STEPS.length - 1)];
}

/** 倍率を変えたあとのスクロール位置。枠の真ん中に見えていた場所を、そのまま真ん中にする(地図の外にははみ出さない) */
export function zoomedScroll(
  from: Scroll,
  view: { width: number; height: number },
  oldZoom: number,
  newZoom: number,
  mapSize: { width: number; height: number },
): Scroll {
  const ratio = newZoom / oldZoom;
  const left = (from.left + view.width / 2) * ratio - view.width / 2;
  const top = (from.top + view.height / 2) * ratio - view.height / 2;
  return { left: clamp(left, mapSize.width - view.width), top: clamp(top, mapSize.height - view.height) };
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
