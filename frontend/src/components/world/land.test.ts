import { describe, expect, it } from "vitest";

import { tileCenter } from "./iso";
import {
  cloudArea,
  cloudLabel,
  cloudLine,
  depthTile,
  footprintCenter,
  footprintTiles,
  hasAnchorsOutside,
  isOpenTile,
  itemSize,
  landEdges,
  landmarkFootprint,
  occupiedTiles,
  openTiles,
  openTilesPath,
  openedLine,
  plotAt,
  pondTiles,
  plotCenter,
  unlockFocus,
  unlockLine,
  unlockTitle,
  validAnchors,
} from "./land";
import type { Tile, WorldLand, WorldPlot } from "./types";

// config/world.php の land と同じ形
const PLOTS: Omit<WorldPlot, "unlocked">[] = [
  { key: "town", name: "はじまりの町", x: 0, y: 0, w: 7, h: 7, min_level: 1, ground: "grass" },
  { key: "bamboo", name: "竹林", x: 7, y: 0, w: 5, h: 7, min_level: 4, ground: "bamboo" },
  { key: "beach", name: "海辺", x: 0, y: 7, w: 7, h: 5, min_level: 7, ground: "sand" },
  { key: "hill", name: "丘", x: 7, y: 7, w: 5, h: 5, min_level: 10, ground: "hill" },
];
const TOWN_BLOCKED: Tile[] = [
  [2, 0], [3, 0], [4, 0], [1, 1], [1, 2], [3, 1], [3, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
];
const BAMBOO_BLOCKED: Tile[] = [[8, 0], [10, 1], [11, 5], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]];

function landAt(level: number): WorldLand {
  return {
    width: 12,
    height: 12,
    plots: PLOTS.map((plot) => ({ ...plot, unlocked: level >= plot.min_level })),
    landmarks: [],
    paths: [],
    blocked: level >= 4 ? [...TOWN_BLOCKED, ...BAMBOO_BLOCKED] : TOWN_BLOCKED,
    spru: { x: 4, y: 3 },
  };
}

const placed = (id: number, x: number | null, y: number | null, footprint = 1) => ({ id, x, y, footprint });
const plotOf = (key: string) => landAt(12).plots.find((plot) => plot.key === key) as WorldPlot;

describe("区画とマス", () => {
  it("マスが入っている区画を返し、地図の外は null", () => {
    const land = landAt(1);
    expect(plotAt(land, 8, 1)?.key).toBe("bamboo");
    expect(plotAt(land, 6, 6)?.key).toBe("town");
    expect(plotAt(land, 12, 0)).toBeNull();
    expect(plotAt(land, -1, 0)).toBeNull();
  });

  it("開いている区画のマスだけが開いている", () => {
    expect(isOpenTile(landAt(3), 7, 0)).toBe(false);
    expect(isOpenTile(landAt(4), 7, 0)).toBe(true);
    expect(isOpenTile(landAt(12), 12, 0)).toBe(false);
  });

  it("開いたマスを奥から並べる", () => {
    expect(openTiles(landAt(1))).toHaveLength(49);
    const tiles = openTiles(landAt(4));
    expect(tiles).toHaveLength(84);
    expect(tiles[0]).toEqual([0, 0]);
    expect(tiles.at(-1)).toEqual([11, 6]);
  });

  it("町だけのときは、町の手前のふちに側面を描く", () => {
    const edges = landEdges(landAt(1));
    expect(edges.left).toContainEqual([3, 6]);
    expect(edges.left).not.toContainEqual([3, 5]);
    expect(edges.right).toContainEqual([6, 2]);
  });

  it("竹林が開くと、町と竹林の境目には側面を描かない", () => {
    const edges = landEdges(landAt(4));
    expect(edges.right).not.toContainEqual([6, 2]);
    expect(edges.right).toContainEqual([11, 2]);
    expect(edges.left).toContainEqual([8, 6]);
  });
});

describe("使うマスと置ける場所", () => {
  it("2×2は奥のマスから右・左・手前の4マスを使う", () => {
    expect(footprintTiles(4, 4, 1)).toEqual([[4, 4]]);
    expect(footprintTiles(4, 4, 2)).toEqual([[4, 4], [5, 4], [4, 5], [5, 5]]);
  });

  it("置いたアイテムが使うマスを集める(バッグと自分は除く)", () => {
    const items = [placed(1, 4, 4, 2), placed(2, 6, 6), placed(3, null, null)];
    expect(occupiedTiles(items, null)).toEqual(new Set(["4,4", "5,4", "4,5", "5,5", "6,6"]));
    expect(occupiedTiles(items, 1)).toEqual(new Set(["6,6"]));
  });

  it("1マスのアイテムは、開いた区画の目印・道でないマスに置ける", () => {
    const anchors = validAnchors(landAt(1), [], 1, null);
    expect(anchors.size).toBe(49 - 14);
    expect(anchors.has("3,3")).toBe(false);
    expect(anchors.has("7,0")).toBe(false);
  });

  it("2×2は、4マスが雲・道にかからない奥のマスだけ", () => {
    const anchors = validAnchors(landAt(1), [], 2, null);
    expect(anchors.has("4,4")).toBe(true);
    expect(anchors.has("5,5")).toBe(true);
    expect(anchors.has("5,0")).toBe(true);
    expect(anchors.has("6,0")).toBe(false);
    expect(anchors.has("4,2")).toBe(false);
    expect(anchors.has("6,6")).toBe(false);
  });

  it("2×2は、地図の端からはみ出す奥のマスには置けない", () => {
    const anchors = validAnchors(landAt(10), [], 2, null);
    expect(anchors.has("10,10")).toBe(true);
    expect(anchors.has("11,10")).toBe(false);
    expect(anchors.has("10,11")).toBe(false);
  });

  it("ほかの2×2と重なる所は置けず、となりにはぴったり置ける", () => {
    const anchors = validAnchors(landAt(10), [placed(1, 4, 4, 2)], 2, null);
    expect(anchors.has("5,5")).toBe(false);
    expect(anchors.has("3,5")).toBe(false);
    expect(anchors.has("5,4")).toBe(false);
    expect(anchors.has("6,4")).toBe(true);
  });

  it("動かしている建物の今の4マスとは重なってよい", () => {
    const castle = placed(1, 4, 4, 2);
    expect(validAnchors(landAt(1), [castle], 2, 1).has("5,4")).toBe(true);
    expect(validAnchors(landAt(1), [castle], 2, null).has("5,4")).toBe(false);
  });
});

describe("絵の位置", () => {
  it("大きな建物の重なり順は手前のマスで比べる", () => {
    expect(depthTile(4, 4, 1)).toEqual({ x: 4, y: 4 });
    expect(depthTile(4, 4, 2)).toEqual({ x: 5, y: 5 });
  });

  it("大きな建物は4マスの真ん中、区画は区画の真ん中に描く", () => {
    expect(footprintCenter(4, 4, 1)).toEqual(tileCenter(4, 4));
    expect(footprintCenter(4, 4, 2)).toEqual({ sx: 0, sy: 160 });
    expect(plotCenter(plotOf("town"))).toEqual(tileCenter(3, 3));
  });
});

describe("雲の範囲", () => {
  it("区画の形に切り取り、海に面した辺だけ半マス外へ広げる(開いた区画には雲がかからない)", () => {
    const land = landAt(1);
    // 竹林: 奥の町側と手前の丘側は区画の辺どおり、地図の外に面した右奥と右手前は半マス広げる
    expect(cloudArea(land, plotOf("bamboo"))).toBe("240,104 416,192 176,312 0,224");
    // 丘: 奥は海辺・竹林と接し、手前の2辺だけ広げる
    expect(cloudArea(land, plotOf("hill"))).toBe("0,224 176,312 0,400 -176,312");
  });
});

describe("雲とお祝いの文", () => {
  it("雲の札とスプルのひとこと", () => {
    expect(cloudLabel(plotOf("bamboo"))).toBe("竹林 Lv.4で解放");
    expect(cloudLine(plotOf("bamboo"))).toBe("レベル4になると雲が晴れるよ");
  });

  it("お祝いの見出しは、1つなら「〇〇エリア」、2つ以上なら名前を並べる", () => {
    expect(unlockTitle([plotOf("bamboo")])).toBe("竹林エリアが広がったよ！");
    expect(unlockTitle([plotOf("bamboo"), plotOf("beach")])).toBe("竹林・海辺が広がったよ！");
  });

  it("区画ごとのひとことと、雲が晴れた後のひとこと", () => {
    expect(unlockLine("beach")).toBe("海のにおいがするね！");
    expect(unlockLine("unknown")).toBe("新しい土地が広がったよ");
    expect(openedLine(plotOf("bamboo"))).toBe("竹林に行けるようになったよ！");
  });

  it("お祝いで地図を動かす先は、いちばん必要レベルの高い区画", () => {
    expect(unlockFocus([plotOf("bamboo"), plotOf("hill"), plotOf("beach")]).key).toBe("hill");
  });

  it("町の外にも置ける場所があるか", () => {
    const town = plotOf("town");
    expect(hasAnchorsOutside(validAnchors(landAt(1), [], 1, null), town)).toBe(false);
    expect(hasAnchorsOutside(validAnchors(landAt(4), [], 1, null), town)).toBe(true);
  });
});

describe("目印の大きさ(Spruの家は2×2)", () => {
  it("footprint がない目印は1マス、あれば N×N", () => {
    expect(landmarkFootprint({ key: "torii", x: 3, y: 0 })).toBe(1);
    expect(landmarkFootprint({ key: "spru_house", x: 1, y: 1, footprint: 2 })).toBe(2);
  });

  it("家(1,1)の2×2は、(2,2)が手前の角で、絵は4マスの真ん中", () => {
    const size = landmarkFootprint({ key: "spru_house", x: 1, y: 1, footprint: 2 });
    expect(depthTile(1, 1, size)).toEqual({ x: 2, y: 2 });
    expect(footprintCenter(1, 1, size)).toEqual(tileCenter(1.5, 1.5));
    expect(footprintTiles(1, 1, size)).toEqual([
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("海(陸の四隅を欠いた海岸線)", () => {
  const withWater = (): WorldLand => ({ ...landAt(12), water: [[6, 0], [6, 1]] });

  it("海のマスは、開いた区画の中でも、開いたマスではない(陸でない)", () => {
    const land = withWater();
    expect(isOpenTile(land, 6, 0)).toBe(false);
    expect(isOpenTile(land, 5, 0)).toBe(true);
    expect(openTiles(land).some(([x, y]) => x === 6 && y === 0)).toBe(false);
  });

  it("海に面したマスには、側面(崖)が付く", () => {
    const land = withWater();
    // (6,2) の奥(上)は海。側面は左手前・右手前なので、(5,0)・(5,1) の右手前は海になり、右の側面が付く
    expect(landEdges(land).right.some(([x, y]) => x === 5 && y === 0)).toBe(true);
    // 海のない地図では、(5,0)の右手前(6,0)も陸なので付かない
    expect(landEdges(landAt(12)).right.some(([x, y]) => x === 5 && y === 0)).toBe(false);
  });

  it("置ける場所(validAnchors)にも海は入らない", () => {
    const land = withWater();
    expect(validAnchors(land, [], 1, null).has("6,0")).toBe(false);
    expect(validAnchors(land, [], 1, null).has("5,0")).toBe(true);
  });
});

describe("陸の形(1本のパス)", () => {
  it("開いた陸のマスの菱形を、1本のパスにまとめる(海のマスは含まない)", () => {
    const land: WorldLand = { ...landAt(1), water: [[6, 6]] };
    const path = openTilesPath(land);
    expect(path.startsWith("M")).toBe(true);
    expect(path.split("Z").length - 1).toBe(openTiles(land).length);
    expect(openTilesPath({ ...landAt(1), water: [] }).split("Z").length - 1).toBe(openTiles(landAt(1)).length);
  });

  it("オフセットを付けると、すべての点が同じだけ下へずれる(海岸の波打ち際用)", () => {
    const land = landAt(1);
    const base = openTilesPath(land).match(/-?\d+(\.\d+)?/g)!.map(Number);
    const shifted = openTilesPath(land, 40).match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < base.length; i += 2) {
      expect(shifted[i]).toBe(base[i]);
      expect(shifted[i + 1]).toBe(base[i + 1] + 40);
    }
  });
});

describe("池(まわりが、すべて開いた陸でかこまれた水)", () => {
  const withWater = (level: number, water: Tile[]): WorldLand => ({ ...landAt(level), water });

  it("開いた陸でぐるりとかこまれた水のマスは、池になる", () => {
    expect(pondTiles(withWater(12, [[6, 6]]))).toEqual([[6, 6]]);
  });

  it("つながった水(2×2)は、まわり全部が開いた陸なら、全部が池", () => {
    const land = withWater(12, [[5, 5], [6, 5], [5, 6], [6, 6]]);
    expect(pondTiles(land)).toHaveLength(4);
  });

  it("まわりに、地図の外・雲の区画がある水は、池でなく海(くぼみ)のまま", () => {
    expect(pondTiles(withWater(12, [[6, 0]]))).toEqual([]); // 北は地図の外
    expect(pondTiles(withWater(1, [[6, 6]]))).toEqual([]); // 東の竹林が雲
  });

  it("つながった水の一部でも、外にふれる所が閉じていれば、その水全部が池でない", () => {
    expect(pondTiles(withWater(1, [[5, 5], [6, 5], [6, 6]]))).toEqual([]);
  });

  it("池のとなりのマスには、池の側に崖(側面)を付けない", () => {
    const land = withWater(12, [[6, 6]]);
    const edges = landEdges(land);
    expect(edges.right.some(([x, y]) => x === 5 && y === 6)).toBe(false); // (5,6)の右手前は池
    expect(edges.left.some(([x, y]) => x === 6 && y === 5)).toBe(false); // (6,5)の左手前は池
    // 池でなく海のとき(まわりが閉じている)は、今までどおり崖が付く
    expect(landEdges(withWater(1, [[6, 6]])).right.some(([x, y]) => x === 5 && y === 6)).toBe(true);
  });
});

describe("長方形の大きさ(幅×高さ。docs/design/2026-10-19-town-rect-design.md)", () => {
  it("itemSize: w・h があればそれ、なければ footprint の正方形", () => {
    expect(itemSize({ footprint: 2 })).toEqual({ w: 2, h: 2 });
    expect(itemSize({ footprint: 3, w: 3, h: 2 })).toEqual({ w: 3, h: 2 });
    expect(itemSize({ footprint: 3, w: 2, h: 3 })).toEqual({ w: 2, h: 3 });
  });

  it("footprintTiles: 幅は x の向き、高さは y の向き。高さを省くと正方形", () => {
    expect(footprintTiles(4, 4, 3, 2)).toEqual([[4, 4], [5, 4], [6, 4], [4, 5], [5, 5], [6, 5]]);
    expect(footprintTiles(1, 1, 2)).toEqual([[1, 1], [2, 1], [1, 2], [2, 2]]);
  });

  it("depthTile・footprintCenter: 幅・高さで、手前のマス・真ん中が決まる", () => {
    expect(depthTile(4, 4, 3, 2)).toEqual({ x: 6, y: 5 });
    expect(depthTile(4, 4, 2)).toEqual({ x: 5, y: 5 });
    expect(footprintCenter(4, 4, 3, 2)).toEqual(tileCenter(5, 4.5));
    expect(footprintCenter(4, 4, 2)).toEqual(tileCenter(4.5, 4.5));
  });

  it("occupiedTiles: 置いた長方形が、その向きのマスを使う", () => {
    const used = occupiedTiles([{ id: 1, x: 4, y: 4, footprint: 3, w: 3, h: 2 }], null);
    expect([...used].sort()).toEqual(["4,4", "4,5", "5,4", "5,5", "6,4", "6,5"]);
  });

  it("validAnchors: 長方形の大きさ{w,h}で、おさまる奥のマスを返す(雲・道にかかる所は出ない)", () => {
    const land = landAt(1);
    const anchors = validAnchors(land, [], { w: 3, h: 2 }, null);
    // 町の右下ブロック(x=4〜6・y=4〜6)に、3×2 は y=4・5 の2通り
    expect(anchors.has("4,4")).toBe(true);
    expect(anchors.has("4,5")).toBe(true);
    expect(anchors.has("5,4")).toBe(false); // x=7 が雲
    expect(anchors.has("4,6")).toBe(false); // y=7 が雲
    // 反転した 2×3 なら、x=4〜5・6の2通り、y=4 から
    const rotated = validAnchors(land, [], { w: 2, h: 3 }, null);
    expect(rotated.has("4,4")).toBe(true);
    expect(rotated.has("5,4")).toBe(true);
    expect(rotated.has("4,5")).toBe(false);
    // 数字だけの大きさ(今まで)も使える
    expect(validAnchors(land, [], 2, null).has("4,4")).toBe(true);
  });
});
