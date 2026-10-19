import { bloomRect, type Bloom } from "@/components/spru/bloom";
import type { SpruView } from "@/components/spru/mood";
import { plantImage } from "@/components/spru/plant";
import { COMPANION_IMAGES, SPRU_BLOOM, SPRU_IMAGES, SPRU_STAND_HEIGHT, type CompanionKey } from "@/components/spru/spru-assets";
import { roadArt, roadEdge, type RoadEdge } from "@/components/travel/road";

import { SPRU_WALK, SPRU_WALK_SIZE, type WalkDirection, type WalkFrame } from "@/components/spru/spru-walk";

import { assetFootprint } from "../art-keys";
import { blendCells, blendGroups, type BlendKind } from "../blend";
import { GROUND_ART, GROUND_DECALS } from "../ground-art";
import { decalAt, decalOffset, pathEdges, plotPoints, roadMarks } from "../ground";
import { sceneViewBox, tileCenter, tileKey, type ViewBox } from "../iso";
import { imagePlacement, itemImage, lightCircles, type ImagePlacement } from "../item-image";
import {
  cloudArea,
  depthTile,
  footprintCenter,
  footprintTiles,
  isOpenTile,
  landEdges,
  landmarkFootprint,
  occupiedTiles,
  openTiles,
  openTilesPath,
  plotAt,
} from "../land";
import { ITEM_IMAGE_FIT } from "../item-image-fit";
import type { Ground, Tile, WorldCompanion, WorldGarden, WorldItem, WorldLand, WorldPlot } from "../types";
import { GROUND, PATH_COLOR } from "./palette";

/**
 * 町のCanvasが描く物の一覧(docs/design/2026-10-19-town-canvas-design.md 5章)。
 * SVG版(world-scene.tsx)と同じ計算を、画面を描かない純粋な関数にしたもの。座標はSVGの単位(原点=マス(0,0)の上の角を基準にした iso.ts の座標)
 */

// 町の中のスプルの立ち姿の高さ(SVGの単位)。座る・寝る・仲間は素材集の縮尺どおりにそろえる
export const TOWN_STAND_HEIGHT = 58;
export const TOWN_SCALE = TOWN_STAND_HEIGHT / SPRU_STAND_HEIGHT;
/** 土地の側面の高さ(iso.ts の LAND_THICKNESS と同じ) */
export { LAND_THICKNESS } from "../iso";

type Pt = [number, number];

export type SceneTheme = { groundTint: { color: string; opacity: number } | null; dimObjects: boolean; lit: boolean };

export type SceneInput = {
  land: WorldLand;
  items: WorldItem[];
  companions: WorldCompanion[];
  garden: WorldGarden;
  spru: SpruView;
  bloom: Bloom | null;
  theme: SceneTheme;
  roadStyle: string;
  validTiles: Set<string>;
  placing: boolean;
  preview: { x: number; y: number; item: WorldItem } | null;
  veil: { keys: string[]; fading: boolean } | null;
  reviewGiver: string | null;
  /** 見るだけ(家族の町)。畑の光は出さない */
  readOnly?: boolean;
  /** 歩いているスプル(マスの番号は小数)。なければ、いつもの場所に立つ */
  walker?: { x: number; y: number; dir: WalkDirection; walking: boolean } | null;
};

/** 歩く絵は、立ち姿より少し小さく描かれているので、並べて見て合わせる倍率(docs/design/2026-10-19-town-roads-design.md 6章) */
export const WALK_SCALE = 1.15;

export type ImageDraw = { src: string; size: { width: number; height: number }; placement: ImagePlacement };
export type Light = { cx: number; cy: number; r: number };
/** 畑の絵: 畝(いつも)と、育っている芽(あれば) */
export type GardenDraw = { plant: { src: string; width: number; height: number } | null };

type Base = { id: string; x: number; y: number; sx: number; sy: number };

export type SceneObject =
  | (Base & { kind: "landmark"; landmarkKey: string; footprint: number; image: ImageDraw | null; garden: GardenDraw | null; lights: Light[] })
  | (Base & {
      kind: "item";
      itemId: number;
      footprint: number;
      image: ImageDraw | null;
      fallback: "flower" | "gift" | null;
      mirrored: boolean;
      lights: Light[];
    })
  | (Base & { kind: "companion"; key: CompanionKey; src: string; width: number; height: number; index: number; partner: boolean; review: boolean })
  | (Base & {
      kind: "spru";
      src: string;
      width: number;
      height: number;
      bloom: { src: string; x: number; y: number; width: number; height: number } | null;
      review: boolean;
      /** 歩いている間の絵(向きごとの3コマ)。立っているときは null */
      walk: { width: number; height: number; frames: Record<WalkFrame, string> } | null;
    });

export type CloudDraw = { plot: WorldPlot; area: Pt[]; puffs: { sx: number; sy: number }[] };

export type GroundModel = {
  landPath: string;
  shorePath: string;
  edgesLeft: { sx: number; sy: number }[];
  edgesRight: { sx: number; sy: number }[];
  /** 地面の絵がある開いた区画(1つの菱形で塗る) */
  plots: { key: string; ground: Ground; points: Pt[]; art: { src: string; size: number } }[];
  /** 絵のない地面の市松 */
  checker: { x: number; y: number; color: string }[];
  pathTiles: Tile[];
  road: { src: string; size: number } | null;
  pathColor: string;
  pathLines: string[];
  marks: { center: string[]; crossings: string[] } | null;
  edge: RoadEdge;
  blend: { kind: BlendKind; cells: Tile[]; art: { src: string; size: number } | null }[];
  decals: { x: number; y: number; kind: number; dx: number; dy: number }[];
  /** 夜などの色を重ねる開いた区画の形 */
  plotShapes: Pt[][];
};

export type SceneModel = {
  vb: ViewBox;
  theme: SceneTheme;
  ground: GroundModel;
  objects: SceneObject[];
  clouds: CloudDraw[];
  veil: { fading: boolean; clouds: CloudDraw[] } | null;
  gardenGlow: boolean;
  gardenTile: Tile;
  validTiles: Tile[];
  preview: { tiles: Tile[]; center: { sx: number; sy: number }; item: ObjectArt } | null;
  /** 寝ているとき、家の上の「zzz」の位置 */
  sleepMark: { sx: number; sy: number } | null;
};

/** アイテムの絵(置いた物・プレビュー)。絵がなければ fallback の絵 */
export type ObjectArt = { image: ImageDraw | null; fallback: "flower" | "gift" | null; footprint: number };

// 畑の状態ごとの絵と高さ(SVGの単位。garden-art.tsx と同じ)
const PLANT = {
  seed: { stage: "seed", height: 16 },
  sprout: { stage: "sprout", height: 24 },
  sprout_big: { stage: "bud", height: 30 },
} as const;

const parsePoints = (points: string): Pt[] =>
  points.split(" ").map((p) => {
    const [x, y] = p.split(",").map(Number);
    return [x, y];
  });

const byDepth = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x + a.y - (b.x + b.y) || a.x - b.x;

type PlacedCompanion = WorldCompanion & { key: CompanionKey; x: number; y: number };

function isPlacedCompanion(companion: WorldCompanion): companion is PlacedCompanion {
  return companion.x !== null && companion.y !== null && companion.key in COMPANION_IMAGES;
}

function imageDraw(key: string | null, footprint: number): ImageDraw | null {
  const image = itemImage(key);
  if (!image || key === null) return null;
  return { src: image.src, size: { width: image.width, height: image.height }, placement: imagePlacement(image, footprint, ITEM_IMAGE_FIT[key]) };
}

function cloudOf(land: WorldLand, plot: WorldPlot): CloudDraw {
  const puffs: { sx: number; sy: number }[] = [];
  for (let y = plot.y; y < plot.y + plot.h; y++) {
    for (let x = plot.x; x < plot.x + plot.w; x++) {
      if ((x + y) % 2 === 0) puffs.push(tileCenter(x, y));
    }
  }
  return { plot, area: parsePoints(cloudArea(land, plot)), puffs };
}

/** 地面の層の中身。アイテム・道・区画・時間帯が変わらない間は、使い回せる(スプルが歩くたびに作り直さない) */
export function buildGroundModel(input: Pick<SceneInput, "land" | "items" | "companions" | "theme" | "roadStyle">): GroundModel {
  const { land, items, companions, roadStyle } = input;

  // 地面
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const tiles = openTiles(land);
  const edges = landEdges(land);
  const openPlots = land.plots.filter((plot) => plot.unlocked);
  const artPlots = openPlots.filter((plot) => GROUND_ART[plot.ground]);
  const road = roadArt(roadStyle);
  const edge = roadEdge(roadStyle);
  const checker = tiles
    .filter(([x, y]) => !pathSet.has(tileKey(x, y)) && !GROUND_ART[plotAt(land, x, y)?.ground ?? "grass"])
    .map(([x, y]) => ({ x, y, color: GROUND[plotAt(land, x, y)?.ground ?? "grass"].tile[(x + y) % 2] }));
  const pathTiles = tiles.filter(([x, y]) => pathSet.has(tileKey(x, y)));
  const open = (x: number, y: number) => isOpenTile(land, x, y);
  const pathLines = road ? pathEdges(land.paths, open) : [];
  const marks = road && edge.marks ? roadMarks(land.paths, open) : null;

  const placedCompanions = companions.filter(isPlacedCompanion);

  // 小物は、道・目印・アイテム・スプル・仲間が立たないマスに、マスの座標から決まる位置へ置く(毎回同じ)
  const decals: GroundModel["decals"] = [];
  if (GROUND_DECALS.length > 0) {
    const taken = new Set([
      ...land.blocked.map(([x, y]) => tileKey(x, y)),
      ...occupiedTiles(items, null),
      tileKey(land.spru.x, land.spru.y),
      ...placedCompanions.map((c) => tileKey(c.x, c.y)),
    ]);
    for (const [x, y] of tiles) {
      if (taken.has(tileKey(x, y))) continue;
      const kind = decalAt(x, y, GROUND_DECALS.length);
      if (kind !== null) decals.push({ x, y, kind, ...decalOffset(x, y) });
    }
  }

  // 林・花畑
  const blend: GroundModel["blend"] = [];
  const groups = blendGroups(items);
  if (groups.length > 0) {
    const fixed = [
      ...land.blocked.map(([x, y]) => tileKey(x, y)),
      tileKey(land.spru.x, land.spru.y),
      ...placedCompanions.map((c) => tileKey(c.x, c.y)),
    ];
    for (const group of groups) {
      const others = occupiedTiles(items.filter((item) => !group.itemIds.includes(item.id)), null);
      const blocked = new Set([...fixed, ...others]);
      const art = GROUND_ART[group.kind];
      blend.push({ kind: group.kind, cells: blendCells(group, blocked, open), art: art ? { src: art.src, size: art.size } : null });
    }
  }

  const ground: GroundModel = {
    landPath: openTilesPath(land),
    shorePath: openTilesPath(land, 32),
    edgesLeft: edges.left.map(([x, y]) => tileCenter(x, y)),
    edgesRight: edges.right.map(([x, y]) => tileCenter(x, y)),
    plots: artPlots.map((plot) => ({
      key: plot.key,
      ground: plot.ground,
      points: parsePoints(plotPoints(plot)),
      art: { src: GROUND_ART[plot.ground]!.src, size: GROUND_ART[plot.ground]!.size },
    })),
    checker,
    pathTiles,
    road: road ? { src: road.art.src, size: road.art.size } : null,
    pathColor: PATH_COLOR,
    pathLines,
    marks,
    edge,
    blend,
    decals,
    plotShapes: openPlots.map((plot) => parsePoints(plotPoints(plot))),
  };
  return ground;
}

export function buildSceneModel(input: SceneInput, groundModel?: GroundModel): SceneModel {
  const { land, items, companions, garden, spru, bloom, theme } = input;
  const vb = sceneViewBox(land.width, land.height);
  const ground = groundModel ?? buildGroundModel(input);
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  // 奥から手前へ描くことで、手前の物が奥の物に重なる
  const at = (x: number, y: number) => ({ x, y, ...tileCenter(x, y) });
  const lit = theme.lit;
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i): SceneObject => {
      const footprint = landmarkFootprint(l);
      const plant = l.key === "garden" && garden.state !== "empty" ? PLANT[garden.state] : null;
      const asset = plant ? plantImage(garden.look, plant.stage) : null;
      return {
        kind: "landmark",
        id: `landmark-${i}`,
        ...depthTile(l.x, l.y, footprint),
        ...footprintCenter(l.x, l.y, footprint),
        landmarkKey: l.key,
        footprint,
        image: l.key === "garden" ? null : imageDraw(l.key, footprint),
        garden:
          l.key === "garden"
            ? { plant: plant && asset ? { src: asset.src, width: (asset.width * plant.height) / asset.height, height: plant.height } : null }
            : null,
        lights: lit && l.key !== "garden" ? lightCircles(l.key, footprint) : [],
      };
    }),
    ...placed.map((item): SceneObject => {
      const image = imageDraw(item.asset_key, assetFootprint(item.asset_key));
      return {
        kind: "item",
        id: `item-${item.id}`,
        itemId: item.id,
        ...depthTile(item.x, item.y, item.footprint),
        ...footprintCenter(item.x, item.y, item.footprint),
        footprint: item.footprint,
        image,
        fallback: image ? null : item.asset_key === "spru_flower" ? "flower" : "gift",
        mirrored: item.mirrored ?? false,
        lights: lit ? lightCircles(item.asset_key, item.footprint) : [],
      };
    }),
    ...placedCompanions.map((companion, index): SceneObject => {
      const asset = COMPANION_IMAGES[companion.key];
      const width = asset.width * TOWN_SCALE;
      const height = asset.height * TOWN_SCALE;
      return {
        kind: "companion",
        id: `companion-${companion.key}`,
        ...at(companion.x, companion.y),
        key: companion.key,
        src: asset.src,
        width,
        height,
        index,
        partner: companion.is_partner,
        review: input.reviewGiver === companion.key,
      };
    }),
    (() => {
      const asset = SPRU_IMAGES[spru.image];
      const walking = input.walker?.walking ? input.walker : null;
      const width = walking ? SPRU_WALK_SIZE.width * TOWN_SCALE * WALK_SCALE : asset.width * TOWN_SCALE;
      const height = walking ? SPRU_WALK_SIZE.height * TOWN_SCALE * WALK_SCALE : asset.height * TOWN_SCALE;
      const rect = bloom && !walking ? bloomRect(spru.image, bloom) : null;
      const x = -width / 2;
      const y = -height + 2;
      const pos = input.walker ?? land.spru;
      return {
        kind: "spru" as const,
        id: "spru",
        ...at(pos.x, pos.y),
        src: asset.src,
        width,
        height,
        bloom:
          bloom && rect
            ? { src: SPRU_BLOOM[bloom].src, x: x + rect.x * TOWN_SCALE, y: y + rect.y * TOWN_SCALE, width: rect.width * TOWN_SCALE, height: rect.height * TOWN_SCALE }
            : null,
        review: input.reviewGiver === "spru",
        walk: walking
          ? {
              width,
              height,
              frames: {
                passing: SPRU_WALK[`${walking.dir}_passing`],
                step_l: SPRU_WALK[`${walking.dir}_step_l`],
                step_r: SPRU_WALK[`${walking.dir}_step_r`],
              },
            }
          : null,
      };
    })(),
  ]
    .filter((o) => !(o.kind === "spru" && spru.sleeping))
    .sort(byDepth);

  const house = land.landmarks.find((landmark) => landmark.key === "spru_house");
  const houseCenter = house ? footprintCenter(house.x, house.y, landmarkFootprint(house)) : null;

  const previewItem = input.preview?.item ?? null;

  return {
    vb,
    theme,
    ground,
    objects,
    clouds: land.plots.filter((plot) => !plot.unlocked).map((plot) => cloudOf(land, plot)),
    veil: input.veil
      ? { fading: input.veil.fading, clouds: land.plots.filter((plot) => input.veil!.keys.includes(plot.key)).map((plot) => cloudOf(land, plot)) }
      : null,
    gardenGlow: !input.placing && !input.readOnly && (garden.can_sow || garden.can_water),
    gardenTile: [garden.x, garden.y],
    validTiles: input.placing ? [...input.validTiles].map((key) => key.split(",").map(Number) as Tile) : [],
    preview:
      input.preview && previewItem
        ? {
            tiles: footprintTiles(input.preview.x, input.preview.y, previewItem.footprint),
            center: footprintCenter(input.preview.x, input.preview.y, previewItem.footprint),
            item: (() => {
              const image = imageDraw(previewItem.asset_key, assetFootprint(previewItem.asset_key));
              return { image, fallback: image ? null : previewItem.asset_key === "spru_flower" ? "flower" : "gift", footprint: previewItem.footprint };
            })(),
          }
        : null,
    sleepMark: spru.sleeping && houseCenter ? { sx: houseCenter.sx + 14, sy: houseCenter.sy - 86 } : null,
  };
}

/** 崖の岩肌の絵 */
export const CLIFF_SRC = "/town/cliff.webp";

/** この町を描くのに要る画像(読み込む物)。重なりなし */
export function modelSources(model: SceneModel): string[] {
  const srcs = new Set<string>([CLIFF_SRC]);
  for (const plot of model.ground.plots) srcs.add(plot.art.src);
  if (model.ground.road) srcs.add(model.ground.road.src);
  for (const layer of model.ground.blend) if (layer.art) srcs.add(layer.art.src);
  for (const decal of model.ground.decals) srcs.add(GROUND_DECALS[decal.kind].src);
  for (const o of model.objects) {
    if (o.kind === "landmark") {
      if (o.image) srcs.add(o.image.src);
      if (o.garden?.plant) srcs.add(o.garden.plant.src);
    } else if (o.kind === "item") {
      if (o.image) srcs.add(o.image.src);
    } else if (o.kind === "spru") {
      srcs.add(o.src);
      if (o.bloom) srcs.add(o.bloom.src);
    } else {
      srcs.add(o.src);
    }
  }
  if (model.preview?.item.image) srcs.add(model.preview.item.image.src);
  // 歩く絵(12枚で約130KB)。歩き始めて絵が抜けないよう、先に読んでおく
  for (const src of Object.values(SPRU_WALK)) srcs.add(src);
  // 絵のない「スプルの花」は、花の絵を重ねて描く
  const flower = model.objects.some((o) => o.kind === "item" && o.fallback === "flower") || model.preview?.item.fallback === "flower";
  if (flower) srcs.add(SPRU_BLOOM.flower.src);
  return [...srcs];
}

/**
 * 動かない層(地面・崖・道・小物など)が変わるかを調べる鍵。同じなら、保存した層を使い回す。
 * アイテム・仲間・スプルの位置は、小物や林・花畑の置き場所を変えるので含める
 */
export function groundSignature(input: Pick<SceneInput, "land" | "items" | "companions" | "theme" | "roadStyle">): string {
  return JSON.stringify([
    input.land,
    input.items.map((i) => [i.id, i.x, i.y, i.footprint, i.asset_key]),
    input.companions.filter(isPlacedCompanion).map((c) => [c.key, c.x, c.y]),
    input.roadStyle,
    input.theme,
  ]);
}
