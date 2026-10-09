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

const round2 = (n: number) => Math.round(n * 100) / 100;
const pt = (x: number, y: number) => `${round2(x)},${round2(y)}`;
// マス(x,y)の中心(SVGの座標)
const tileCenter = (x: number, y: number): [number, number] => [(x - y) * HALF_W, (x + y + 1) * HALF_H];

/**
 * アスファルトの道のしるし(設計書 2026-10-09-road-look 3章)。center は中心線(つながる道のマスの中心を結ぶ。
 * 交差点のマス=3方向以上につながるマス の真ん中には線を引かず、手前で止める)、crossings は交差点に入る
 * 手前のマスの横断歩道(道の向きに平行な白い縞4本)。閉じた区画(isOpen が false)のマスは数えない
 */
export function roadMarks(
  paths: [number, number][],
  isOpen: (x: number, y: number) => boolean,
): { center: string[]; crossings: string[] } {
  const set = new Set(paths.filter(([x, y]) => isOpen(x, y)).map(([x, y]) => `${x},${y}`));
  const has = (x: number, y: number) => set.has(`${x},${y}`);
  const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const degree = (x: number, y: number) => DIRS.filter(([dx, dy]) => has(x + dx, y + dy)).length;
  const center: string[] = [];
  const crossings: string[] = [];
  // 縞は、渡る向き(もう一方のマスの軸)に並べる。長さ=マス間の距離の0.2、間隔=0.16
  const gridStep = (dx: number, dy: number): [number, number] => [(dx - dy) * HALF_W, (dx + dy) * HALF_H];
  for (const key of set) {
    const [x, y] = key.split(",").map(Number);
    const junction = degree(x, y) >= 3;
    const [cx, cy] = tileCenter(x, y);
    for (const [dx, dy] of DIRS) {
      if (!has(x + dx, y + dy)) continue;
      const neighborJunction = degree(x + dx, y + dy) >= 3;
      const [ux, uy] = gridStep(dx, dy); // このマスから隣のマスの中心へのベクトル
      if (junction) continue;
      if (neighborJunction) {
        // 交差点の手前: 中心線は短い切れ端で止め、交差点側に横断歩道
        center.push(`M${pt(cx, cy)} L${pt(cx + ux * 0.16, cy + uy * 0.16)}`);
        const [vx, vy] = gridStep(dy === 0 ? 0 : 1, dx === 0 ? 0 : 1);
        const px = cx + ux * 0.42;
        const py = cy + uy * 0.42;
        const stripes = [-0.24, -0.08, 0.08, 0.24].map((t) => {
          const sx = px + vx * t;
          const sy = py + vy * t;
          return `M${pt(sx - ux * 0.1, sy - uy * 0.1)} L${pt(sx + ux * 0.1, sy + uy * 0.1)}`;
        });
        crossings.push(stripes.join(" "));
      } else if (dx > 0 || dy > 0) {
        center.push(`M${pt(cx, cy)} L${pt(cx + ux, cy + uy)}`);
      }
    }
  }

  return { center, crossings };
}
