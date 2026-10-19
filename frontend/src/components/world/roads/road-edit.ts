import { isOpenTile, occupiedTiles } from "../land";
import { tileKey } from "../iso";
import type { Tile, WorldItem, WorldLand } from "../types";

/**
 * 町の道を引く・消すときの、画面を描かない計算(docs/design/2026-10-19-town-roads-design.md 3-1・5章)。
 * 引ける場所の決まりは、サーバー(`WorldRoads::apply`)と同じ。サーバーが最後に決める
 */

type Placed = Pick<WorldItem, "id" | "x" | "y" | "footprint">;
export type RoadTool = "draw" | "erase";
/** 1回の操作の差分(サーバーの add・remove と同じ形) */
export type Edit = { add: Tile[]; remove: Tile[] };

/** 道の上限(サーバーが教えないときの値。config/world.php の roads.max と同じ) */
export const DEFAULT_ROADS_MAX = 300;
export const HISTORY_LIMIT = 20;

/** 2つのマスの間を、4方向の階段でつなぐ(ななめも、隣のマスだけでつながる)。試作の `line` と同じ */
export function strokeTiles(from: Tile, to: Tile): Tile[] {
  const out: Tile[] = [[from[0], from[1]]];
  let [x, y] = from;
  while (x !== to[0] || y !== to[1]) {
    if (Math.abs(to[0] - x) >= Math.abs(to[1] - y) && x !== to[0]) x += Math.sign(to[0] - x);
    else y += Math.sign(to[1] - y);
    out.push([x, y]);
  }
  return out;
}

/** 引けるか: 開いた区画の陸で、目印・道(もとの道と自分の道)・アイテムのないマス */
export function canDrawAt(land: WorldLand, items: Placed[], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= land.width || y >= land.height) return false;
  if (!isOpenTile(land, x, y)) return false;
  if (land.blocked.some(([bx, by]) => bx === x && by === y)) return false;
  return !occupiedTiles(items, null).has(tileKey(x, y));
}

/** 消せるか: 自分が引いた道だけ */
export function canEraseAt(land: WorldLand, x: number, y: number): boolean {
  return (land.custom_paths ?? []).some(([cx, cy]) => cx === x && cy === y);
}

/** なぞったマスから、サーバーに送る差分を作る(重なりなし。引けない・消せないマスは捨てる。上限をこえる分も捨てる) */
export function diffStroke(tool: RoadTool, tiles: Tile[], land: WorldLand, items: Placed[]): Edit {
  const seen = new Set<string>();
  const picked: Tile[] = [];
  const occupied = occupiedTiles(items, null);
  const room = (land.roads_max ?? DEFAULT_ROADS_MAX) - (land.custom_paths?.length ?? 0);
  for (const [x, y] of tiles) {
    const key = tileKey(x, y);
    if (seen.has(key)) continue;
    seen.add(key);
    const ok = tool === "draw" ? canDrawAt(land, items, x, y) && !occupied.has(key) : canEraseAt(land, x, y);
    if (ok && (tool === "erase" || picked.length < room)) picked.push([x, y]);
  }
  return tool === "draw" ? { add: picked, remove: [] } : { add: [], remove: picked };
}

export function isEmptyEdit(edit: Edit): boolean {
  return edit.add.length === 0 && edit.remove.length === 0;
}

/** 逆の操作(もどす用) */
export function invertEdit(edit: Edit): Edit {
  return { add: edit.remove, remove: edit.add };
}

/** もどす・やりなおすの履歴。画面を開いている間だけ覚える */
export type History = { past: Edit[]; future: Edit[] };

export const emptyHistory = (): History => ({ past: [], future: [] });

/** 操作を記録する。空の操作は記録しない。記録すると、やりなおしは消える */
export function recordEdit(history: History, edit: Edit): History {
  if (isEmptyEdit(edit)) return history;
  return { past: [...history.past, edit].slice(-HISTORY_LIMIT), future: [] };
}

/** もどす。サーバーに送る差分(逆の操作)と、新しい履歴を返す。もどせなければ null */
export function undoEdit(history: History): { edit: Edit; history: History } | null {
  const last = history.past.at(-1);
  if (!last) return null;
  return { edit: invertEdit(last), history: { past: history.past.slice(0, -1), future: [...history.future, last] } };
}

/** やりなおす。もう一度送る差分と、新しい履歴を返す。やりなおせなければ null */
export function redoEdit(history: History): { edit: Edit; history: History } | null {
  const next = history.future.at(-1);
  if (!next) return null;
  return { edit: next, history: { past: [...history.past, next], future: history.future.slice(0, -1) } };
}

/** 操作を、道の一覧に当てる(画面にすぐ反映する用)。順番は、引いた順 */
export function applyEdit(custom: Tile[], edit: Edit): Tile[] {
  const removing = new Set(edit.remove.map(([x, y]) => tileKey(x, y)));
  const kept = custom.filter(([x, y]) => !removing.has(tileKey(x, y)));
  const have = new Set(kept.map(([x, y]) => tileKey(x, y)));
  return [...kept, ...edit.add.filter(([x, y]) => !have.has(tileKey(x, y)))];
}

/** 道を、町の土地(land)に当てる: custom_paths・paths・blocked を同じように更新する。もとの道・目印はそのまま */
export function withCustomRoads(land: WorldLand, custom: Tile[]): WorldLand {
  const old = new Set((land.custom_paths ?? []).map(([x, y]) => tileKey(x, y)));
  const base = (tiles: Tile[]) => tiles.filter(([x, y]) => !old.has(tileKey(x, y)));
  return { ...land, custom_paths: custom, paths: [...base(land.paths), ...custom], blocked: [...base(land.blocked), ...custom] };
}
