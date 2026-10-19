import { HALF_H, HALF_W, tileCenter, tileKey } from "./iso";
import type { Landmark, Tile, WorldItem, WorldLand, WorldPlot } from "./types";

type Plots = Pick<WorldLand, "plots"> & { water?: Tile[] };
type Rect = Pick<WorldPlot, "x" | "y" | "w" | "h">;
type Placed = Pick<WorldItem, "id" | "x" | "y" | "footprint" | "w" | "h">;

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

// 海のマスの集合は、land ごとに1回だけ作る
const waterSets = new WeakMap<object, Set<string>>();
function waterOf(land: Plots): Set<string> {
  let set = waterSets.get(land);
  if (!set) {
    set = new Set((land.water ?? []).map(([x, y]) => tileKey(x, y)));
    waterSets.set(land, set);
  }
  return set;
}

export function isWaterTile(land: Plots, x: number, y: number): boolean {
  return waterOf(land).has(tileKey(x, y));
}

// 池のマスの集合は、land ごとに1回だけ作る
const pondSets = new WeakMap<object, Set<string>>();

function pondsOf(land: Plots): Set<string> {
  let set = pondSets.get(land);
  if (set) return set;
  set = new Set<string>();
  const water = waterOf(land);
  const seen = new Set<string>();
  const neighbors: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const start of water) {
    if (seen.has(start)) continue;
    // つながった水(上下左右)をひとまとめにし、まわりが全部開いた陸かを調べる
    const group: Tile[] = [];
    const queue: Tile[] = [start.split(",").map(Number) as Tile];
    seen.add(start);
    let enclosed = true;
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      group.push([x, y]);
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        const key = tileKey(nx, ny);
        if (water.has(key)) {
          if (!seen.has(key)) {
            seen.add(key);
            queue.push([nx, ny]);
          }
        } else if (!isOpenTile(land, nx, ny)) {
          enclosed = false;
        }
      }
    }
    if (enclosed) for (const [x, y] of group) set.add(tileKey(x, y));
  }
  pondSets.set(land, set);
  return set;
}

/** 池のマス(まわりが、すべて開いた陸でかこまれた水。海のくぼみと違い、陸の中の池として描く) */
export function pondTiles(land: Plots): Tile[] {
  return [...pondsOf(land)].map((key) => key.split(",").map(Number) as Tile);
}

export function isPondTile(land: Plots, x: number, y: number): boolean {
  return pondsOf(land).has(tileKey(x, y));
}

/** 開いた区画にある、陸のマス(海は含まない) */
export function isOpenTile(land: Plots, x: number, y: number): boolean {
  return (plotAt(land, x, y)?.unlocked ?? false) && !isWaterTile(land, x, y);
}

/** 開いている区画のマス(奥から手前の順) */
export function openTiles(land: Plots): Tile[] {
  const tiles: Tile[] = [];
  for (const plot of land.plots) {
    if (!plot.unlocked) continue;
    for (let y = plot.y; y < plot.y + plot.h; y++) {
      for (let x = plot.x; x < plot.x + plot.w; x++) {
        if (!isWaterTile(land, x, y)) tiles.push([x, y]);
      }
    }
  }
  return tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
}

/** 陸のマスの菱形を1本のパスにまとめる(隙間の線が出ない切り抜き・縁取り用)。dy は全体を下へずらす量 */
export function openTilesPath(land: Plots, dy = 0): string {
  return openTiles(land)
    .map(([x, y]) => {
      const { sx, sy } = tileCenter(x, y);
      return `M${sx} ${sy - HALF_H + dy}L${sx + HALF_W} ${sy + dy}L${sx} ${sy + HALF_H + dy}L${sx - HALF_W} ${sy + dy}Z`;
    })
    .join("");
}

/** 土地の側面を描くマス。left は左手前(x, y+1)、right は右手前(x+1, y)に開いた土地が続かないマス */
export function landEdges(land: Plots): { left: Tile[]; right: Tile[] } {
  const tiles = openTiles(land);
  return {
    // 池のとなりは、陸がつづいているのと同じ(池は陸の中の水なので、崖を付けない)
    left: tiles.filter(([x, y]) => !isOpenTile(land, x, y + 1) && !isPondTile(land, x, y + 1)),
    right: tiles.filter(([x, y]) => !isOpenTile(land, x + 1, y) && !isPondTile(land, x + 1, y)),
  };
}

/** (x, y) を奥のマスにして使うマス */
/** 目印の大きさ(N×NのN)。footprint がない目印は1マス(Spruの家だけ2。config/world.php の land.landmarks) */
export function landmarkFootprint(landmark: Landmark): number {
  return landmark.footprint ?? 1;
}

/** いまの向きの大きさ(幅 w は x の向き、高さ h は y の向き)。w・h がなければ footprint の正方形 */
export function itemSize(item: { footprint: number; w?: number; h?: number }): { w: number; h: number } {
  return { w: item.w ?? item.footprint, h: item.h ?? item.footprint };
}

/** (x, y) を奥のマスにして使うマス。高さ h を省くと w×w の正方形 */
export function footprintTiles(x: number, y: number, w: number, h: number = w): Tile[] {
  const tiles: Tile[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) tiles.push([x + dx, y + dy]);
  }
  return tiles;
}

/** 置いたアイテム(exceptId を除く)が使っているマス */
export function occupiedTiles(items: Placed[], exceptId: number | null): Set<string> {
  const occupied = new Set<string>();
  for (const item of items) {
    if (item.id === exceptId || item.x === null || item.y === null) continue;
    const { w, h } = itemSize(item);
    for (const [x, y] of footprintTiles(item.x, item.y, w, h)) occupied.add(tileKey(x, y));
  }
  return occupied;
}

/** 置ける場所(奥のマス)。使うマスがすべて、開いた区画にあり、目印・道でなく、ほかと重ならない(設計書3-4) */
export function validAnchors(land: WorldLand, items: Placed[], size: number | { w: number; h: number }, exceptId: number | null): Set<string> {
  const { w, h } = typeof size === "number" ? { w: size, h: size } : size;
  const blocked = new Set(land.blocked.map(([x, y]) => tileKey(x, y)));
  const occupied = occupiedTiles(items, exceptId);
  const anchors = new Set<string>();
  for (let y = 0; y < land.height; y++) {
    for (let x = 0; x < land.width; x++) {
      const fits = footprintTiles(x, y, w, h).every(
        ([tx, ty]) => isOpenTile(land, tx, ty) && !blocked.has(tileKey(tx, ty)) && !occupied.has(tileKey(tx, ty)),
      );
      if (fits) anchors.add(tileKey(x, y));
    }
  }
  return anchors;
}

/** 重なり順に使うマス。大きな建物は手前のマスで比べる(設計書3-4) */
export function depthTile(x: number, y: number, w: number, h: number = w): { x: number; y: number } {
  return { x: x + w - 1, y: y + h - 1 };
}

/** 絵を描く位置。大きな建物は4マスの真ん中 */
export function footprintCenter(x: number, y: number, w: number, h: number = w): { sx: number; sy: number } {
  return tileCenter(x + (w - 1) / 2, y + (h - 1) / 2);
}

export function plotCenter(plot: Rect): { sx: number; sy: number } {
  return tileCenter(plot.x + (plot.w - 1) / 2, plot.y + (plot.h - 1) / 2);
}

// マス目の角の点(u, v)の画面の座標。マス(x, y)の奥の角が(x, y)
const corner = (u: number, v: number) => `${(u - v) * HALF_W},${(u + v) * HALF_H}`;

/** 雲を描く範囲。区画の形に切り取り、開いた区画に雲がかからないようにする。海に面した辺だけ半マス外へ広げる */
export function cloudArea(land: Plots, plot: WorldPlot): string {
  const midX = plot.x + Math.floor(plot.w / 2);
  const midY = plot.y + Math.floor(plot.h / 2);
  const sea = (x: number, y: number) => (plotAt(land, x, y) === null ? 0.5 : 0);
  const u0 = plot.x - sea(plot.x - 1, midY);
  const v0 = plot.y - sea(midX, plot.y - 1);
  const u1 = plot.x + plot.w + sea(plot.x + plot.w, midY);
  const v1 = plot.y + plot.h + sea(midX, plot.y + plot.h);
  return [corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)].join(" ");
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
