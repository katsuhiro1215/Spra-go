import { tileCenter, tileKey } from "./iso";
import type { Tile, WorldItem, WorldLand, WorldPlot } from "./types";

type Plots = Pick<WorldLand, "plots">;
type Rect = Pick<WorldPlot, "x" | "y" | "w" | "h">;
type Placed = Pick<WorldItem, "id" | "x" | "y" | "footprint">;

// 区画が開いたときのお祝いのひとこと(設計書5-2)
const UNLOCK_LINES: Record<string, string> = {
  bamboo: "竹がさらさら鳴ってるよ",
  beach: "海のにおいがするね！",
  hill: "ここなら大きな建物が建てられそう！",
};

const inRect = (rect: Rect, x: number, y: number) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

/** マスが入っている区画(地図の外なら null) */
export function plotAt(land: Plots, x: number, y: number): WorldPlot | null {
  return land.plots.find((plot) => inRect(plot, x, y)) ?? null;
}

export function isOpenTile(land: Plots, x: number, y: number): boolean {
  return plotAt(land, x, y)?.unlocked ?? false;
}

/** 開いている区画のマス(奥から手前の順) */
export function openTiles(land: Plots): Tile[] {
  const tiles: Tile[] = [];
  for (const plot of land.plots) {
    if (!plot.unlocked) continue;
    for (let y = plot.y; y < plot.y + plot.h; y++) {
      for (let x = plot.x; x < plot.x + plot.w; x++) tiles.push([x, y]);
    }
  }
  return tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
}

/** 土地の側面を描くマス。left は左手前(x, y+1)、right は右手前(x+1, y)に開いた土地が続かないマス */
export function landEdges(land: Plots): { left: Tile[]; right: Tile[] } {
  const tiles = openTiles(land);
  return {
    left: tiles.filter(([x, y]) => !isOpenTile(land, x, y + 1)),
    right: tiles.filter(([x, y]) => !isOpenTile(land, x + 1, y)),
  };
}

/** (x, y) を奥のマスにして使うマス */
export function footprintTiles(x: number, y: number, footprint: number): Tile[] {
  const tiles: Tile[] = [];
  for (let dy = 0; dy < footprint; dy++) {
    for (let dx = 0; dx < footprint; dx++) tiles.push([x + dx, y + dy]);
  }
  return tiles;
}

/** 置いたアイテム(exceptId を除く)が使っているマス */
export function occupiedTiles(items: Placed[], exceptId: number | null): Set<string> {
  const occupied = new Set<string>();
  for (const item of items) {
    if (item.id === exceptId || item.x === null || item.y === null) continue;
    for (const [x, y] of footprintTiles(item.x, item.y, item.footprint)) occupied.add(tileKey(x, y));
  }
  return occupied;
}

/** 置ける場所(奥のマス)。使うマスがすべて、開いた区画にあり、目印・道でなく、ほかと重ならない(設計書3-4) */
export function validAnchors(land: WorldLand, items: Placed[], footprint: number, exceptId: number | null): Set<string> {
  const blocked = new Set(land.blocked.map(([x, y]) => tileKey(x, y)));
  const occupied = occupiedTiles(items, exceptId);
  const anchors = new Set<string>();
  for (let y = 0; y < land.height; y++) {
    for (let x = 0; x < land.width; x++) {
      const fits = footprintTiles(x, y, footprint).every(
        ([tx, ty]) => isOpenTile(land, tx, ty) && !blocked.has(tileKey(tx, ty)) && !occupied.has(tileKey(tx, ty)),
      );
      if (fits) anchors.add(tileKey(x, y));
    }
  }
  return anchors;
}

/** 重なり順に使うマス。大きな建物は手前のマスで比べる(設計書3-4) */
export function depthTile(x: number, y: number, footprint: number): { x: number; y: number } {
  return { x: x + footprint - 1, y: y + footprint - 1 };
}

/** 絵を描く位置。大きな建物は4マスの真ん中 */
export function footprintCenter(x: number, y: number, footprint: number): { sx: number; sy: number } {
  return tileCenter(x + (footprint - 1) / 2, y + (footprint - 1) / 2);
}

export function plotCenter(plot: Rect): { sx: number; sy: number } {
  return tileCenter(plot.x + (plot.w - 1) / 2, plot.y + (plot.h - 1) / 2);
}

export function cloudLabel(plot: Pick<WorldPlot, "name" | "min_level">): string {
  return `${plot.name} Lv.${plot.min_level}で解放`;
}

export function cloudLine(plot: Pick<WorldPlot, "min_level">): string {
  return `レベル${plot.min_level}になると雲が晴れるよ`;
}

export function unlockTitle(plots: Pick<WorldPlot, "name">[]): string {
  return plots.length === 1 ? `${plots[0].name}エリアが広がったよ！` : `${plots.map((plot) => plot.name).join("・")}が広がったよ！`;
}

export function unlockLine(key: string): string {
  return UNLOCK_LINES[key] ?? "新しい土地が広がったよ";
}

export function openedLine(plot: Pick<WorldPlot, "name">): string {
  return `${plot.name}に行けるようになったよ！`;
}

/** お祝いで地図を動かす先。いちばん必要レベルの高い区画(設計書3-2) */
export function unlockFocus(plots: WorldPlot[]): WorldPlot {
  return plots.reduce((a, b) => (b.min_level > a.min_level ? b : a));
}

/** 置く場所を選ぶとき、その区画(最初に見えている町)の外にも置ける場所があるか */
export function hasAnchorsOutside(anchors: Set<string>, plot: Rect): boolean {
  for (const key of anchors) {
    const [x, y] = key.split(",").map(Number);
    if (!inRect(plot, x, y)) return true;
  }
  return false;
}
