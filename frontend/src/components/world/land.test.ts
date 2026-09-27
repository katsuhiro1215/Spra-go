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
  landEdges,
  occupiedTiles,
  openTiles,
  openedLine,
  plotAt,
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
    spru: { x: 1, y: 3 },
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
