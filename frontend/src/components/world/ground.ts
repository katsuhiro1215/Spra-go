import { HALF_H, HALF_W } from "./iso";

/** 地面の絵の変形・区画の菱形・小物の位置(設計書 2026-10-05-town-blend 3章)。どれも純粋な関数 */

/**
 * 真上から見た正方形の絵(textureSize px)を、4×4マスをおおう菱形に変形する SVG の patternTransform。
 * 絵の横の端(textureSize)は菱形の右下方向へ (4×HALF_W, 4×HALF_H)、縦の端は左下方向へ (−4×HALF_W, 4×HALF_H)
 */
export function patternMatrix(textureSize: number): string {
  const a = (4 * HALF_W) / textureSize;
  const b = (4 * HALF_H) / textureSize;
  return `matrix(${a} ${b} ${-a} ${b} 0 0)`;
}

type Rect = { x: number; y: number; w: number; h: number };

const corner = (u: number, v: number) => `${(u - v) * HALF_W},${(u + v) * HALF_H}`;

/** 区画(x, y が奥の角、w×h マス)を1つの菱形にした points。上・右・下・左の順 */
export function plotPoints(plot: Rect): string {
  return [
    corner(plot.x, plot.y),
    corner(plot.x + plot.w, plot.y),
    corner(plot.x + plot.w, plot.y + plot.h),
    corner(plot.x, plot.y + plot.h),
  ].join(" ");
}

// マスの座標から決まる整数(Math.random を使わない。何度描いても、リロードしても同じ)
function cellHash(x: number, y: number): number {
  let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** そのマスの小物(0〜kinds−1の番号)。約15%のマスに出る。出ないマスは null */
export function decalAt(x: number, y: number, kinds: number): number | null {
  if (kinds <= 0) return null;
  const h = cellHash(x, y);
  if (h % 100 >= 15) return null;
  return (h >>> 8) % kinds;
}

/** 小物を、マスの中心からずらす量(SVGの単位。横±12・縦±5) */
export function decalOffset(x: number, y: number): { dx: number; dy: number } {
  const h = cellHash(y + 101, x + 53);
  return { dx: (h % 25) - 12, dy: ((h >>> 8) % 11) - 5 };
}

/**
 * 道のふちの線(SVGの path の d)。道のマスの4辺のうち、隣が道でなく、開いた区画のマスである辺だけ。
 * 辺は、奥の角 N(x,y)・右 E(x+1,y)・手前 S(x+1,y+1)・左 W(x,y+1) を結ぶ。
 * 北東の辺=(x,y−1)、南東=(x+1,y)、南西=(x,y+1)、北西=(x−1,y) との境
 */
export function pathEdges(paths: [number, number][], isOpen: (x: number, y: number) => boolean): string[] {
  const pathSet = new Set(paths.map(([x, y]) => `${x},${y}`));
  const edges: string[] = [];
  for (const [x, y] of paths) {
    const sides: [number, number, string, string][] = [
      [x, y - 1, corner(x, y), corner(x + 1, y)],
      [x + 1, y, corner(x + 1, y), corner(x + 1, y + 1)],
      [x, y + 1, corner(x + 1, y + 1), corner(x, y + 1)],
      [x - 1, y, corner(x, y + 1), corner(x, y)],
    ];
    for (const [nx, ny, from, to] of sides) {
      if (!pathSet.has(`${nx},${ny}`) && isOpen(nx, ny)) edges.push(`M${from} L${to}`);
    }
  }
  return edges;
}
