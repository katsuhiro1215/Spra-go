import type { WalkDirection, WalkFrame } from "@/components/spru/spru-walk";

/**
 * Spruが町を歩く、画面を描かない計算(docs/design/2026-10-19-town-roads-design.md 3-2・5-1)。
 * 座標はマスの番号(小数)。(x, y) は、そのマスの中心を指す。試作の `route` と歩き方に合わせる
 */

import { footprintTiles, isOpenTile, landmarkFootprint, occupiedTiles } from "../land";
import { tileKey } from "../iso";
import type { Tile, WorldCompanion, WorldItem, WorldLand } from "../types";

/**
 * 歩ける場所: 開いた区画の陸のマスで、目印・アイテム・町に立っている仲間のいるマスでないところ
 * (道の上も草の上も歩ける)。畑も目印なので歩かない
 */
export function walkableTiles(
  land: WorldLand,
  items: Pick<WorldItem, "id" | "x" | "y" | "footprint">[],
  companions: Pick<WorldCompanion, "x" | "y">[],
): (x: number, y: number) => boolean {
  const taken = occupiedTiles(items, null);
  for (const landmark of land.landmarks) {
    for (const [x, y] of footprintTiles(landmark.x, landmark.y, landmarkFootprint(landmark))) taken.add(tileKey(x, y));
  }
  for (const c of companions) if (c.x !== null && c.y !== null) taken.add(tileKey(c.x, c.y));
  return (x, y) => x >= 0 && y >= 0 && x < land.width && y < land.height && isOpenTile(land, x, y) && !taken.has(tileKey(x, y));
}

/** 1秒に進むマス数 */
export const WALK_SPEED = 2.8;
/** 歩く絵のコマの入れかえ(1秒に8コマ) */
const FRAMES_PER_SECOND = 8;
const CYCLE: WalkFrame[] = ["step_r", "passing", "step_l", "passing"];

export type Walker = {
  x: number;
  y: number;
  /** これから通るマス(いま向かっているマスが先頭) */
  path: Tile[];
  dir: WalkDirection;
};

export const idleWalker = (x: number, y: number): Walker => ({ x, y, path: [], dir: "lower_left" });

export const isWalking = (walker: Walker): boolean => walker.path.length > 0;

const NEIGHBORS: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** 4方向の最短の経路。いまのマスは含まず、着くマスを含む。行けない・同じマスなら空 */
export function routeTo(from: Tile, to: Tile, walkable: (x: number, y: number) => boolean): Tile[] {
  if ((from[0] === to[0] && from[1] === to[1]) || !walkable(to[0], to[1])) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const previous = new Map<string, Tile | null>([[key(from[0], from[1]), null]]);
  const queue: Tile[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    if (x === to[0] && y === to[1]) {
      const path: Tile[] = [];
      let at: Tile | null = [x, y];
      while (at && !(at[0] === from[0] && at[1] === from[1])) {
        path.push(at);
        at = previous.get(key(at[0], at[1])) ?? null;
      }
      return path.reverse();
    }
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (walkable(nx, ny) && !previous.has(key(nx, ny))) {
        previous.set(key(nx, ny), [x, y]);
        queue.push([nx, ny]);
      }
    }
  }
  return [];
}

/** 動く向きから、絵の向き(+xが右下、−xが左上、+yが左下、−yが右上) */
export function facing(dx: number, dy: number): WalkDirection {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "lower_right" : "upper_left";
  return dy > 0 ? "lower_left" : "upper_right";
}

/**
 * 行き先を決める。歩いている途中なら、いま向かっているマスまでは進んでから、新しい経路で行く(飛ばない)。
 * 行けなければ、いまのまま
 */
export function walkTo(walker: Walker, target: Tile, walkable: (x: number, y: number) => boolean): Walker {
  const head = walker.path[0];
  const from: Tile = head ?? [Math.round(walker.x), Math.round(walker.y)];
  const route = routeTo(from, target, walkable);
  if (route.length === 0) {
    // いま向かっているマスが行き先なら、そこで止まる。行けない行き先なら、いまのまま
    return head && head[0] === target[0] && head[1] === target[1] ? { ...walker, path: [head] } : walker;
  }
  const path = head ? [head, ...route] : route;
  return { ...walker, path, dir: facing(path[0][0] - walker.x, path[0][1] - walker.y) };
}

/** dt 秒ぶん進める。1回で何マスも進んでよい(角で向きを変える)。着いたら、ぴったりそのマスで止まる */
export function stepWalker(walker: Walker, dt: number): Walker {
  if (walker.path.length === 0) return walker;
  let { x, y, dir } = walker;
  const path = [...walker.path];
  let budget = WALK_SPEED * dt;
  while (path.length > 0 && budget > 0) {
    const [tx, ty] = path[0];
    const dx = tx - x;
    const dy = ty - y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) dir = facing(dx, dy);
    if (distance <= budget) {
      x = tx;
      y = ty;
      budget -= distance;
      path.shift();
    } else {
      x += (dx / distance) * budget;
      y += (dy / distance) * budget;
      budget = 0;
    }
  }
  return { x, y, path, dir };
}

/** いま見せる歩く絵のコマ。t は時計(秒)。立っているときは足をそろえた形 */
export function walkFrame(t: number, walking: boolean): WalkFrame {
  if (!walking) return "passing";
  return CYCLE[Math.floor(t * FRAMES_PER_SECOND) % CYCLE.length];
}
