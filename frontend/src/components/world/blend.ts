import { footprintTiles } from "./land";
import type { Tile } from "./types";

/**
 * 町がなじむ(設計書 2026-10-05-town-blend 4章)。木・花が3つ以上、斜めを含めて隣り合うと、
 * その足元が林・花畑の地面に変わり、にぎやか度が上がる。どれも純粋な関数(画面の描き方は world-scene.tsx)
 */

export const TREE_KEYS: readonly string[] = ["tree", "sakura", "momiji", "pine", "young_tree", "broadleaf_tree", "large_tree"];
export const FLOWER_KEYS: readonly string[] = ["flowerbed", "tulip", "sunflower", "pathside_flowers"];

/** まとまりの最小のアイテム数 */
export const BLEND_MIN_ITEMS = 3;
/** にぎやか度の加点: まとまり1つごと、最大3つまで */
export const BLEND_BONUS = 4;
export const BLEND_MAX = 3;

export type BlendItem = { id: number; asset_key: string | null; x: number | null; y: number | null; footprint?: number };
export type BlendKind = "grove" | "meadow";
export type BlendGroup = { kind: BlendKind; itemIds: number[]; cells: Tile[] };

function kindOf(key: string | null): BlendKind | null {
  if (key === null) return null;
  if (TREE_KEYS.includes(key)) return "grove";
  if (FLOWER_KEYS.includes(key)) return "meadow";
  return null;
}

const tileKey = (x: number, y: number) => `${x},${y}`;

/** 置いた木・花から、3つ以上が(斜めを含めて)隣り合うまとまりを求める。木と花は別々に数える */
export function blendGroups(items: BlendItem[]): BlendGroup[] {
  const placed = items
    .map((item) => ({ item, kind: kindOf(item.asset_key) }))
    .filter((entry): entry is { item: BlendItem & { x: number; y: number }; kind: BlendKind } =>
      entry.kind !== null && entry.item.x !== null && entry.item.y !== null)
    .map(({ item, kind }) => ({ id: item.id, kind, cells: footprintTiles(item.x, item.y, item.footprint ?? 1) }));

  const parent = placed.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const near = (a: Tile[], b: Tile[]) => a.some(([ax, ay]) => b.some(([bx, by]) => Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1));

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (placed[i].kind === placed[j].kind && near(placed[i].cells, placed[j].cells)) parent[find(i)] = find(j);
    }
  }

  const byRoot = new Map<number, typeof placed>();
  placed.forEach((entry, i) => byRoot.set(find(i), [...(byRoot.get(find(i)) ?? []), entry]));

  return [...byRoot.values()]
    .filter((members) => members.length >= BLEND_MIN_ITEMS)
    .map((members) => {
      const seen = new Set<string>();
      const cells: Tile[] = [];
      for (const member of members) {
        for (const [x, y] of member.cells) {
          if (!seen.has(tileKey(x, y))) {
            seen.add(tileKey(x, y));
            cells.push([x, y]);
          }
        }
      }
      return { kind: members[0].kind, itemIds: members.map((m) => m.id).sort((a, b) => a - b), cells };
    })
    .sort((a, b) => a.itemIds[0] - b.itemIds[0]);
}

/** 地面が変わるマス: まとまりのマスと、周囲1マス(8方向)。blocked(道・目印・ほかのアイテムなど)と地図の外は除く */
export function blendCells(group: BlendGroup, blocked: Set<string>, inMap: (x: number, y: number) => boolean): Tile[] {
  const seen = new Set<string>();
  const out: Tile[] = [];
  for (const [cx, cy] of group.cells) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const key = tileKey(x, y);
        if (seen.has(key) || blocked.has(key) || !inMap(x, y)) continue;
        seen.add(key);
        out.push([x, y]);
      }
    }
  }
  return out;
}

/** にぎやか度の加点(まとまり1つ+4、最大3つ) */
export function blendBonus(groups: BlendGroup[]): number {
  return Math.min(groups.length, BLEND_MAX) * BLEND_BONUS;
}
