import { describe, expect, it } from "vitest";

import { SPRU_IMAGES } from "@/components/spru/spru-assets";

import { footprintCenter, depthTile } from "../land";
import { imagePlacement } from "../item-image";
import type { WorldCompanion, WorldGarden, WorldItem, WorldLand } from "../types";
import { buildGroundModel, buildSceneModel, CLIFF_SRC, groundSignature, modelSources, type SceneInput } from "./scene-model";

/** docs/design/2026-10-19-town-canvas-design.md 5章・7章。SVG版(world-scene.tsx)と同じ計算になること */

const land: WorldLand = {
  width: 8,
  height: 4,
  plots: [
    { key: "town", name: "はじまりの町", x: 0, y: 0, w: 4, h: 4, min_level: 1, ground: "grass", unlocked: true },
    { key: "bamboo", name: "竹林", x: 4, y: 0, w: 4, h: 4, min_level: 5, ground: "bamboo", unlocked: false },
  ],
  landmarks: [
    { key: "spru_house", x: 1, y: 1, footprint: 2 },
    { key: "stone_lantern", x: 3, y: 0 },
    { key: "garden", x: 0, y: 2 },
  ],
  paths: [
    [0, 3],
    [1, 3],
    [2, 3],
  ],
  blocked: [],
  spru: { x: 3, y: 3 },
};

const garden: WorldGarden = {
  x: 0,
  y: 2,
  state: "sprout",
  look: null,
  waterings: 1,
  learned_today: false,
  watered_today: false,
  spru_seed_ready: false,
  seed_bag: [],
  can_sow: false,
  can_water: false,
};

const item = (id: number, asset_key: string, x: number, y: number, footprint = 1, over: Partial<WorldItem> = {}): WorldItem => ({
  id,
  shop_item_id: id,
  name: asset_key,
  asset_key,
  footprint,
  category: "nature",
  souvenir: false,
  x,
  y,
  ...over,
});

const day = { background: "", groundTint: null, dimObjects: false, lit: false };
const night = { background: "", groundTint: { color: "#1b2552", opacity: 0.42 }, dimObjects: true, lit: true };

function input(over: Partial<SceneInput> = {}): SceneInput {
  return {
    land,
    items: [],
    companions: [],
    garden,
    spru: { image: "front", face: "smile", line: "", sleeping: false } as SceneInput["spru"],
    bloom: null,
    theme: day,
    roadStyle: "jp",
    validTiles: new Set(),
    placing: false,
    preview: null,
    veil: null,
    reviewGiver: null,
    ...over,
  };
}

describe("奥から手前の並び", () => {
  it("目印・アイテム・スプルが、重なり順のマス(x+y、同じならx)で並ぶ", () => {
    const model = buildSceneModel(input({ items: [item(1, "tree", 2, 0), item(2, "tree", 0, 0)] }));
    const keys = model.objects.map((o) => o.x + o.y);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(model.objects.at(-1)?.kind).toBe("spru"); // スプルは(3,3)でいちばん手前
  });

  it("寝ているスプルは、町に出ない", () => {
    const model = buildSceneModel(input({ spru: { image: "front", face: "normal", line: "", sleeping: true } as SceneInput["spru"] }));
    expect(model.objects.some((o) => o.kind === "spru")).toBe(false);
    expect(model.sleepMark).not.toBeNull(); // 家の「zzz」
  });

  it("起きているときは、家の「zzz」を出さない", () => {
    expect(buildSceneModel(input()).sleepMark).toBeNull();
  });
});

describe("アイテムの絵", () => {
  it("2×2は、4マスの真ん中・奥のマスでなく手前のマスで重なり順を決める。絵の位置は imagePlacement と同じ", () => {
    const model = buildSceneModel(input({ items: [item(5, "tower", 4, 0, 2)] }));
    const o = model.objects.find((x) => x.kind === "item" && x.id === "item-5");
    expect(o).toBeDefined();
    if (!o || o.kind !== "item") return;
    expect({ x: o.x, y: o.y }).toEqual(depthTile(4, 0, 2));
    const c = footprintCenter(4, 0, 2);
    expect({ sx: o.sx, sy: o.sy }).toEqual(c);
    expect(o.image?.placement).toEqual(imagePlacement(o.image!.size, 2, { scale: 1.386 }));
  });

  it("左右反転(mirrored)を引き継ぐ", () => {
    const model = buildSceneModel(input({ items: [item(7, "tree", 2, 1, 1, { mirrored: true })] }));
    const o = model.objects.find((x) => x.kind === "item");
    expect(o && o.kind === "item" && o.mirrored).toBe(true);
  });

  it("絵のないキーは、代わりの絵(プレゼント箱)", () => {
    const model = buildSceneModel(input({ items: [item(8, "no_such_art", 2, 1)] }));
    const o = model.objects.find((x) => x.kind === "item");
    expect(o && o.kind === "item" && o.image).toBeNull();
    expect(o && o.kind === "item" && o.fallback).toBe("gift");
  });
});

describe("夜の光の輪", () => {
  it("夜(lit)のときだけ、光る物(石灯籠の目印)に光の輪が付く", () => {
    const lanternOf = (m: ReturnType<typeof buildSceneModel>) => m.objects.find((o) => o.kind === "landmark" && o.landmarkKey === "stone_lantern");
    const dayLantern = lanternOf(buildSceneModel(input()));
    const nightLantern = lanternOf(buildSceneModel(input({ theme: night })));
    expect(dayLantern && dayLantern.kind === "landmark" && dayLantern.lights).toEqual([]);
    expect(nightLantern && nightLantern.kind === "landmark" && nightLantern.lights.length).toBeGreaterThan(0);
  });
});

describe("地面と道", () => {
  it("道のマスは、市松(絵のない地面)に入れない。絵のある地面の区画は市松にしない", () => {
    const model = buildSceneModel(input());
    expect(model.ground.pathTiles).toHaveLength(3);
    const checkerKeys = model.ground.checker.map((t) => `${t.x},${t.y}`);
    expect(checkerKeys).not.toContain("0,3");
    // 地面の絵がある区画は、1つの菱形で塗る(市松は空になる)
    expect(model.ground.plots.map((p) => p.key)).toEqual(["town"]);
  });

  it("アスファルトの道(アメリカ)だけ、中央線を持つ。日本の道は持たない", () => {
    expect(buildSceneModel(input({ roadStyle: "jp" })).ground.marks).toBeNull();
    expect(buildSceneModel(input({ roadStyle: "us" })).ground.marks).not.toBeNull();
  });

  it("道のふちの線は、開いた区画に面した辺だけ", () => {
    const model = buildSceneModel(input());
    expect(model.ground.pathLines.length).toBeGreaterThan(0);
  });

  it("小物は、道・目印・アイテム・スプルのマスに出ない", () => {
    const model = buildSceneModel(input({ items: [item(1, "tree", 2, 2)] }));
    const keys = new Set(model.ground.decals.map((d) => `${d.x},${d.y}`));
    for (const blocked of ["0,3", "2,2", "3,3"]) expect(keys.has(blocked)).toBe(false);
  });
});

describe("雲・置く場所・プレビュー", () => {
  it("閉じた区画に雲。開いた直後の雲(veil)は別に持つ", () => {
    const model = buildSceneModel(input());
    expect(model.clouds.map((c) => c.plot.key)).toEqual(["bamboo"]);
    const veiled = buildSceneModel(input({ veil: { keys: ["town"], fading: true } }));
    expect(veiled.veil?.fading).toBe(true);
    expect(veiled.veil?.clouds.map((c) => c.plot.key)).toEqual(["town"]);
  });

  it("置いている間だけ、置ける場所を持つ。畑の光は、水やり・種まきができるときだけ", () => {
    expect(buildSceneModel(input({ placing: true, validTiles: new Set(["1,1", "2,2"]) })).validTiles).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect(buildSceneModel(input({ validTiles: new Set(["1,1"]) })).validTiles).toEqual([]);
    expect(buildSceneModel(input()).gardenGlow).toBe(false);
    expect(buildSceneModel(input({ garden: { ...garden, can_water: true } })).gardenGlow).toBe(true);
    expect(buildSceneModel(input({ garden: { ...garden, can_water: true }, placing: true })).gardenGlow).toBe(false);
    expect(buildSceneModel(input({ garden: { ...garden, can_water: true }, readOnly: true })).gardenGlow).toBe(false); // 家族の町は見るだけ
  });

  it("プレビューは、使うマスと、うす絵の位置", () => {
    const model = buildSceneModel(input({ preview: { x: 4, y: 0, item: item(9, "tower", 4, 0, 2) } }));
    expect(model.preview?.tiles).toHaveLength(4);
    expect(model.preview?.center).toEqual(footprintCenter(4, 0, 2));
  });
});

describe("仲間とスプル", () => {
  const companion = (over: Partial<WorldCompanion> = {}): WorldCompanion => ({
    key: "lumi",
    name: "ルミ",
    official_name: "Lumi",
    nickname: null,
    trait: "",
    lines: [],
    hearts: 0,
    heart_label: "",
    bond: 0,
    next_heart_bond: null,
    is_partner: true,
    rare: false,
    in_town: true,
    x: 2,
    y: 2,
    ...over,
  });

  it("町に立っている仲間だけ、位置と大きさを持つ。相棒・復習の印を引き継ぐ", () => {
    const model = buildSceneModel(input({ companions: [companion(), companion({ key: "momo", in_town: false, x: null, y: null })], reviewGiver: "lumi" }));
    const list = model.objects.filter((o) => o.kind === "companion");
    expect(list).toHaveLength(1);
    const c = list[0];
    expect(c.kind === "companion" && c.partner).toBe(true);
    expect(c.kind === "companion" && c.review).toBe(true);
  });

  it("スプルの絵の大きさは、立ち姿の高さを町の大きさ(58)にそろえた縮尺", () => {
    const model = buildSceneModel(input());
    const s = model.objects.find((o) => o.kind === "spru");
    expect(s && s.kind === "spru" && Math.round(s.height)).toBe(Math.round((SPRU_IMAGES.front.height * 58) / 208));
  });
});

describe("読み込む画像の一覧", () => {
  it("崖・地面・道・小物・アイテム・スプルの絵を、重なりなく挙げる", () => {
    const model = buildSceneModel(input({ items: [item(1, "tree", 2, 0), item(2, "tree", 1, 0)] }));
    const srcs = modelSources(model);
    expect(new Set(srcs).size).toBe(srcs.length);
    expect(srcs).toContain(CLIFF_SRC);
    expect(srcs).toContain("/spru/items/tree.webp");
    expect(srcs).toContain(SPRU_IMAGES.front.src);
    for (const plot of model.ground.plots) expect(srcs).toContain(plot.art.src);
  });
});

describe("動かない層の鍵", () => {
  it("スプルの言葉・畑の水やりなど、地面に関わらない変化では変わらない", () => {
    const a = groundSignature(input());
    expect(groundSignature(input({ garden: { ...garden, can_water: true }, bloom: "flower" }))).toBe(a);
  });

  it("アイテムを置く・動かす、道の絵、夜になる、で変わる", () => {
    const a = groundSignature(input());
    expect(groundSignature(input({ items: [item(1, "tree", 2, 2)] }))).not.toBe(a);
    expect(groundSignature(input({ roadStyle: "us" }))).not.toBe(a);
    expect(groundSignature(input({ theme: night }))).not.toBe(a);
  });
});

describe("歩くスプル", () => {
  it("歩いている間は、小数のマスの位置で、重なり順に入り、向きの3コマの絵を持つ", () => {
    const model = buildSceneModel(input({ walker: { x: 1.5, y: 3, dir: "lower_right", walking: true } }));
    const s = model.objects.find((o) => o.kind === "spru");
    expect(s && s.kind === "spru" && [s.x, s.y]).toEqual([1.5, 3]);
    expect(s && s.kind === "spru" && s.walk?.frames.step_l).toBe("/spru/walk/lower_right_step_l.webp");
    expect(s && s.kind === "spru" && s.bloom).toBeNull(); // 歩く絵には、つぼみ・花の位置がない
  });

  it("立っているときは、いつもの場所と立ち姿(歩く絵なし)", () => {
    const standing = buildSceneModel(input({ walker: { x: 2, y: 2, dir: "lower_left", walking: false } }));
    const s = standing.objects.find((o) => o.kind === "spru");
    expect(s && s.kind === "spru" && s.walk).toBeNull();
    const none = buildSceneModel(input()).objects.find((o) => o.kind === "spru");
    expect(none && none.kind === "spru" && [none.x, none.y]).toEqual([3, 3]);
  });

  it("歩く絵12枚は、先に読み込む。地面は、スプルの位置が変わっても同じ物を使い回せる", () => {
    const model = buildSceneModel(input());
    expect(modelSources(model).filter((src) => src.startsWith("/spru/walk/"))).toHaveLength(12);
    const ground = buildGroundModel(input());
    const a = buildSceneModel(input({ walker: { x: 1, y: 1, dir: "lower_left", walking: true } }), ground);
    expect(a.ground).toBe(ground);
  });
});

describe("池", () => {
  it("まわりが開いた陸でかこまれた水は、池として地面に入る。海のくぼみは入らない", () => {
    const withWater = (water: [number, number][]) => buildSceneModel(input({ land: { ...land, water } }));
    expect(withWater([[2, 1]]).ground.ponds).toEqual([[2, 1]]);
    expect(withWater([[3, 3]]).ground.ponds).toEqual([]); // 東が雲の区画(竹林)
    expect(buildSceneModel(input()).ground.ponds).toEqual([]);
  });
});
