"use client";

import { useMemo } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { bloomRect, type Bloom } from "@/components/spru/bloom";
import type { SpruView } from "@/components/spru/mood";
import {
  COMPANION_IMAGES,
  SPRU_BLOOM,
  SPRU_IMAGES,
  SPRU_STAND_HEIGHT,
  type CompanionKey,
} from "@/components/spru/spru-assets";
import { SpruFace } from "@/components/spru/spru-figure";

import { TIME_THEME } from "./ambience";
import { roadArt, roadEdge } from "@/components/travel/road";

import { GROUND_ART, GROUND_DECALS, type GroundArtKey } from "./ground-art";
import { blendCells, blendGroups, type BlendKind } from "./blend";
import { decalAt, decalOffset, pathEdges, patternMatrix, plotPoints, roadMarks } from "./ground";
import { GardenArt } from "./garden-art";
import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ItemArt } from "./item-art";
import { lightCircles } from "./item-image";
import {
  cloudArea,
  cloudLabel,
  depthTile,
  footprintCenter,
  footprintTiles,
  isOpenTile,
  landEdges,
  landmarkFootprint,
  occupiedTiles,
  openTiles,
  plotAt,
  plotCenter,
} from "./land";
import { LandmarkArt } from "./landmark-art";
import type { TimeOfDay } from "./time-of-day";
import type { Ground, WorldCompanion, WorldGarden, WorldItem, WorldLand, WorldPlot } from "./types";

// 町の中のスプルの立ち姿の高さ(SVGの単位)。座る・寝る・仲間は素材集の縮尺どおりにそろえる
const TOWN_STAND_HEIGHT = 58;
const TOWN_SCALE = TOWN_STAND_HEIGHT / SPRU_STAND_HEIGHT;

// 区画の地面の色(設計書3-1)。tile は市松の2色、lip は側面の上の縁(左手前・右手前)
const GROUND: Record<Ground, { tile: [string, string]; lip: [string, string] }> = {
  grass: { tile: ["#b4e19b", "#a9da8e"], lip: ["#86c56d", "#74b35d"] },
  bamboo: { tile: ["#94d17e", "#88c872"], lip: ["#6fae55", "#5f9e47"] },
  sand: { tile: ["#f3e2b3", "#ecd8a2"], lip: ["#e0c88c", "#d3ba7c"] },
  hill: { tile: ["#c8eda9", "#bee69d"], lip: ["#9fd684", "#8cc672"] },
};
const PATH_COLOR = "#f1dfbb";
// 林・花畑の地面の絵が届くまでの色(設計書 2026-10-05-town-blend 4-2)
const BLEND_FALLBACK: Record<BlendKind, { color: string; opacity: number }> = {
  grove: { color: "#5f9e47", opacity: 0.45 },
  meadow: { color: "#f3b7d6", opacity: 0.35 },
};
const SOIL = { left: "#d7a574", right: "#bf8a5b" };

type PlacedCompanion = WorldCompanion & { key: CompanionKey; x: number; y: number };

// x, y は重なり順に使うマス(大きな建物は手前のマス)、sx, sy は絵を描く位置
type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; sx: number; sy: number; landmarkKey: string; footprint: number }
  | { kind: "item"; id: string; x: number; y: number; sx: number; sy: number; item: WorldItem }
  | { kind: "companion"; id: string; x: number; y: number; sx: number; sy: number; companion: PlacedCompanion; index: number }
  | { kind: "spru"; id: string; x: number; y: number; sx: number; sy: number };

type TapTarget = {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  label: string;
  onTap: () => void;
  halfWidth: number;
  up: number;
  down: number;
  /** スプルに関わるタップ(家)。ほかの操作として数えない(昼のうたた寝を起こさない) */
  spru?: boolean;
};

// 奥(x+yが小さい)から手前へ並べる
const byDepth = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x + a.y - (b.x + b.y) || a.x - b.x;

function isPlacedCompanion(companion: WorldCompanion): companion is PlacedCompanion {
  return companion.x !== null && companion.y !== null && companion.key in COMPANION_IMAGES;
}

// 土地の側面(左手前・右手前)の形。depth は下へ伸ばす長さ
function leftFace(sx: number, sy: number, depth: number): string {
  return `${sx - HALF_W},${sy} ${sx},${sy + HALF_H} ${sx},${sy + HALF_H + depth} ${sx - HALF_W},${sy + depth}`;
}

function rightFace(sx: number, sy: number, depth: number): string {
  return `${sx},${sy + HALF_H} ${sx + HALF_W},${sy} ${sx + HALF_W},${sy + depth} ${sx},${sy + HALF_H + depth}`;
}

// 雲の区画を隠す雲。区画のマスに1つおきに丸を置いて、もこもこにする。area(区画の形)で切り取り、開いた区画にかからないようにする
function Clouds({ plot, area, className }: { plot: WorldPlot; area: string; className?: string }) {
  const puffs: { key: string; sx: number; sy: number }[] = [];
  for (let y = plot.y; y < plot.y + plot.h; y++) {
    for (let x = plot.x; x < plot.x + plot.w; x++) {
      if ((x + y) % 2 === 0) puffs.push({ key: tileKey(x, y), ...tileCenter(x, y) });
    }
  }
  const clipId = `cloud-area-${plot.key}`;
  return (
    <g clipPath={`url(#${clipId})`}>
      <clipPath id={clipId}>
        <polygon points={area} />
      </clipPath>
      <g className={className}>
        <g fill="#dfeaf2">
          {puffs.map((p) => (
            <circle key={p.key} cx={p.sx} cy={p.sy + 4} r={34} />
          ))}
        </g>
        <g fill="#ffffff">
          {puffs.map((p) => (
            <circle key={p.key} cx={p.sx} cy={p.sy - 4} r={33} />
          ))}
        </g>
      </g>
    </g>
  );
}

export function WorldScene({
  land,
  items,
  validTiles,
  placing,
  onTileTap,
  onItemTap,
  spru,
  bloom,
  onSpruTap,
  timeOfDay,
  poppedItemId,
  garden,
  onGardenTap,
  onHouseTap,
  companions,
  onCompanionTap,
  companionTalk,
  reviewGiver,
  quiet,
  onCloudTap,
  veil = null,
  preview = null,
  readOnly = false,
  roadStyle = "jp",
}: {
  land: WorldLand;
  items: WorldItem[];
  validTiles: Set<string>;
  placing: boolean;
  onTileTap: (x: number, y: number) => void;
  onItemTap: (item: WorldItem) => void;
  spru: SpruView;
  bloom: Bloom | null;
  onSpruTap: () => void;
  timeOfDay: TimeOfDay;
  poppedItemId: number | null;
  garden: WorldGarden;
  onGardenTap: () => void;
  /** スプルの家をタップしたとき(部屋を開く。設計書 2026-10-05-spru-room 6章)。なければ、家はタップできない */
  onHouseTap?: () => void;
  companions: WorldCompanion[];
  onCompanionTap: (key: string) => void;
  companionTalk: { key: string; at: number; line: string } | null;
  reviewGiver: string | null;
  quiet: boolean;
  onCloudTap?: (plot: WorldPlot) => void;
  veil?: { keys: string[]; fading: boolean } | null;
  preview?: { x: number; y: number; item: WorldItem } | null;
  readOnly?: boolean;
  /** 町の道のデザイン(設計書 2026-10-05-road-style)。絵が無ければ日本の道 */
  roadStyle?: string;
}) {
  const theme = TIME_THEME[timeOfDay];
  // 夜は物を少し暗くする(明かりは暗くしない)
  const artStyle = theme.dimObjects ? { filter: "brightness(0.78) saturate(0.85)" } : undefined;
  const vb = sceneViewBox(land.width, land.height);
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const tiles = openTiles(land);
  const edges = landEdges(land);
  const groundOf = (x: number, y: number) => GROUND[plotAt(land, x, y)?.ground ?? "grass"];
  // 地面の絵(設計書 2026-10-05-town-blend 3章)。絵がある地面の区画は1つの菱形で塗り、絵がない地面は今のマスごとの市松で塗る
  const openPlots = land.plots.filter((plot) => plot.unlocked);
  const artPlots = openPlots.filter((plot) => GROUND_ART[plot.ground]);
  const checkerTiles = tiles.filter(([x, y]) => !pathSet.has(tileKey(x, y)) && !GROUND_ART[plotAt(land, x, y)?.ground ?? "grass"]);
  const road = roadArt(roadStyle);
  const pathArt = road?.art;
  const edge = roadEdge(roadStyle);
  const pathTiles = tiles.filter(([x, y]) => pathSet.has(tileKey(x, y)));
  const pathFill = road ? `url(#ground-${road.key})` : PATH_COLOR;
  const artKeys = (Object.keys(GROUND_ART) as GroundArtKey[]).filter((key) => GROUND_ART[key]);
  const pathLines = useMemo(
    () => (pathArt ? pathEdges(land.paths, (x, y) => isOpenTile(land, x, y)) : []),
    [land, pathArt],
  );
  const marks = useMemo(
    () => (pathArt && edge.marks ? roadMarks(land.paths, (x, y) => isOpenTile(land, x, y)) : null),
    [land, pathArt, edge.marks],
  );
  // 小物は、道・目印・アイテム・スプル・仲間が立たないマスに、マスの座標から決まる位置へ置く(毎回同じ)
  const decals = useMemo(() => {
    if (GROUND_DECALS.length === 0) return [];
    const taken = new Set([
      ...land.blocked.map(([x, y]) => tileKey(x, y)),
      ...occupiedTiles(items, null),
      tileKey(land.spru.x, land.spru.y),
      ...companions.filter(isPlacedCompanion).map((c) => tileKey(c.x, c.y)),
    ]);
    const out: { key: string; kind: number; x: number; y: number }[] = [];
    for (const [x, y] of openTiles(land)) {
      if (taken.has(tileKey(x, y))) continue;
      const kind = decalAt(x, y, GROUND_DECALS.length);
      if (kind !== null) out.push({ key: `decal-${x},${y}`, kind, x, y });
    }
    return out;
  }, [land, items, companions]);
  // 林・花畑: 木・花が3つ以上隣り合うまとまりの足元(まとまりのマスと周囲1マス。道・目印・スプル・仲間・ほかのアイテムのマスは除く)
  const blendLayers = useMemo(() => {
    const groups = blendGroups(items);
    if (groups.length === 0) return [];
    const fixed = [
      ...land.blocked.map(([x, y]) => tileKey(x, y)),
      tileKey(land.spru.x, land.spru.y),
      ...companions.filter(isPlacedCompanion).map((c) => tileKey(c.x, c.y)),
    ];
    return groups.map((group) => {
      const others = occupiedTiles(items.filter((item) => !group.itemIds.includes(item.id)), null);
      const blocked = new Set([...fixed, ...others]);
      return { kind: group.kind, cells: blendCells(group, blocked, (x, y) => isOpenTile(land, x, y)) };
    });
  }, [land, items, companions]);
  const lockedPlots = land.plots.filter((plot) => !plot.unlocked);
  const veiledPlots = veil ? land.plots.filter((plot) => veil.keys.includes(plot.key)) : [];
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  const at = (x: number, y: number) => ({ x, y, ...tileCenter(x, y) });
  // 奥から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({
      kind: "landmark" as const,
      id: `landmark-${i}`,
      ...depthTile(l.x, l.y, landmarkFootprint(l)),
      ...footprintCenter(l.x, l.y, landmarkFootprint(l)),
      landmarkKey: l.key,
      footprint: landmarkFootprint(l),
    })),
    ...placed.map((item) => ({
      kind: "item" as const,
      id: `item-${item.id}`,
      ...depthTile(item.x, item.y, item.footprint),
      ...footprintCenter(item.x, item.y, item.footprint),
      item,
    })),
    ...placedCompanions.map((companion, index) => ({
      kind: "companion" as const,
      id: `companion-${companion.key}`,
      ...at(companion.x, companion.y),
      companion,
      index,
    })),
    { kind: "spru" as const, id: "spru", ...at(land.spru.x, land.spru.y) },
  ]
    .filter((o) => !(o.kind === "spru" && spru.sleeping))
    .sort(byDepth);

  // 海は地図全体の下に描く(雲の区画も海の上に浮かぶ)
  const w = land.width;
  const h = land.height;
  const sea = `${-h * HALF_W},${h * HALF_H + 50} ${(w - h) * HALF_W},${(w + h) * HALF_H + 50} ${w * HALF_W},${w * HALF_H + 50} 0,50`;
  // 夜の暗さは、土地の形(側面とマス)に重ねる
  const landShapes = [
    ...edges.left.map(([x, y]) => leftFace(tileCenter(x, y).sx, tileCenter(x, y).sy, LAND_THICKNESS)),
    ...edges.right.map(([x, y]) => rightFace(tileCenter(x, y).sx, tileCenter(x, y).sy, LAND_THICKNESS)),
    // 地面は、マスごとでなく、開いた区画ごとの1つの菱形で重ねる(マスごとだと、重なりの縁に細い線が出るため)
    ...openPlots.map((plot) => plotPoints(plot)),
  ];
  const previewTiles = preview ? footprintTiles(preview.x, preview.y, preview.item.footprint) : [];
  const previewCenter = preview ? footprintCenter(preview.x, preview.y, preview.item.footprint) : null;
  const spruCenter = tileCenter(land.spru.x, land.spru.y);
  // 吹き出しのしっぽがSの先のつぼみ・花に重ならない高さ
  const bubble = toPercent(spruCenter.sx, spruCenter.sy - 72, vb);

  const spruAsset = SPRU_IMAGES[spru.image];
  const spruW = spruAsset.width * TOWN_SCALE;
  const spruH = spruAsset.height * TOWN_SCALE;
  const spruX = -spruW / 2;
  const spruY = -spruH + 2;
  const spruBloom = bloom ? bloomRect(spru.image, bloom) : null;
  const spruMotion = spru.sleeping ? undefined : spru.image === "jump" ? "animate-spru-hop" : "animate-spru-bob";
  const gardenGlow = !placing && !readOnly && (garden.can_sow || garden.can_water);

  const talking = companionTalk ? (placedCompanions.find((c) => c.key === companionTalk.key) ?? null) : null;
  const talkCenter = talking ? tileCenter(talking.x, talking.y) : null;
  const talkPos = talkCenter ? toPercent(talkCenter.sx, talkCenter.sy - 46, vb) : null;

  const boxStyle = (sx: number, sy: number, halfWidth: number, up: number, down: number) => {
    const topLeft = toPercent(sx - halfWidth, sy - up, vb);
    return {
      left: `${topLeft.left}%`,
      top: `${topLeft.top}%`,
      width: `${((halfWidth * 2) / vb.width) * 100}%`,
      height: `${((up + down) / vb.height) * 100}%`,
    };
  };

  // 押せる範囲は上に伸びて奥の物と重なるため、絵と同じく奥から順に並べて手前のボタンを上にする。置く場所を選んでいる間は出さない。
  // 畑は地面の上にあり、手前のアイテムの(背の高い物用に長い)範囲に隠れないよう最後に置く。見るだけ(家族の町)ではアイテムと畑は押せない
  const itemTargets: TapTarget[] = readOnly
    ? []
    : placed.map((item) => {
        const big = item.footprint > 1;
        return {
          id: `item-button-${item.id}`,
          ...depthTile(item.x, item.y, item.footprint),
          ...footprintCenter(item.x, item.y, item.footprint),
          label: `${item.name}(動かす・しまう)`,
          onTap: () => onItemTap(item),
          halfWidth: big ? 60 : HALF_W - 4,
          up: big ? 110 : 56,
          down: big ? 30 : 14,
        };
      });
  const gardenTarget: TapTarget[] = readOnly
    ? []
    : [{ id: "garden-button", ...at(garden.x, garden.y), label: "畑", onTap: onGardenTap, halfWidth: 22, up: 36, down: 12 }];
  // スプルの家は、地面と同じく目印なので、アイテム・仲間のタップより奥(最初)に置き、近くのタップをじゃましない
  const house = land.landmarks.find((landmark) => landmark.key === "spru_house");
  // 家は2×2。押せる範囲と寝ているときの印は、4マスの真ん中・手前の角に合わせる
  const houseCenter = house
    ? { ...depthTile(house.x, house.y, landmarkFootprint(house)), ...footprintCenter(house.x, house.y, landmarkFootprint(house)) }
    : { x: 0, y: 0, sx: 0, sy: 0 };
  const houseTarget: TapTarget[] =
    readOnly || !onHouseTap || !house
      ? []
      : [
          {
            id: "house-button",
            ...houseCenter,
            label: "スプルの家(中をのぞく)",
            onTap: onHouseTap,
            halfWidth: 60,
            up: 110,
            down: 20,
            spru: true,
          },
        ];
  const tapTargets: TapTarget[] = placing
    ? []
    : [
        ...houseTarget,
        ...itemTargets,
        ...placedCompanions.map((c) => ({
          id: `companion-button-${c.key}`,
          ...at(c.x, c.y),
          label: c.name,
          onTap: () => onCompanionTap(c.key),
          halfWidth: 14,
          up: 44,
          down: 4,
        })),
      ]
        .sort(byDepth)
        .concat(gardenTarget);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${vb.width} / ${vb.height}` }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          {artKeys.map((key) => {
            const art = GROUND_ART[key]!;
            return (
              <pattern
                key={key}
                id={`ground-${key}`}
                patternUnits="userSpaceOnUse"
                width={art.size}
                height={art.size}
                patternTransform={patternMatrix(art.size)}
              >
                <image href={art.src} width={art.size} height={art.size} />
              </pattern>
            );
          })}
          <filter id="blend-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {blendLayers.map((layer, i) => (
            <mask key={`blend-mask-${i}`} id={`blend-mask-${i}`} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.width} height={vb.height}>
              <g fill="white" filter="url(#blend-soft)">
                {layer.cells.map(([x, y]) => (
                  <polygon key={tileKey(x, y)} points={tilePoints(x, y)} />
                ))}
              </g>
            </mask>
          ))}
        </defs>
        <polygon points={sea} fill="#62b8d6" opacity={0.55} />

        {edges.left.map(([x, y]) => {
          const { sx, sy } = tileCenter(x, y);
          return (
            <g key={`edge-left-${x},${y}`}>
              <polygon points={leftFace(sx, sy, LAND_THICKNESS)} fill={SOIL.left} stroke={SOIL.left} strokeWidth={0.6} />
              <polygon points={leftFace(sx, sy, 7)} fill={groundOf(x, y).lip[0]} />
              <path d={`M${sx - HALF_W} ${sy + LAND_THICKNESS} L${sx} ${sy + HALF_H + LAND_THICKNESS}`} stroke="#e6f7fb" strokeWidth={3} />
            </g>
          );
        })}
        {edges.right.map(([x, y]) => {
          const { sx, sy } = tileCenter(x, y);
          return (
            <g key={`edge-right-${x},${y}`}>
              <polygon points={rightFace(sx, sy, LAND_THICKNESS)} fill={SOIL.right} stroke={SOIL.right} strokeWidth={0.6} />
              <polygon points={rightFace(sx, sy, 7)} fill={groundOf(x, y).lip[1]} />
              <path d={`M${sx} ${sy + HALF_H + LAND_THICKNESS} L${sx + HALF_W} ${sy + LAND_THICKNESS}`} stroke="#e6f7fb" strokeWidth={3} />
            </g>
          );
        })}

        {artPlots.map((plot) => (
          <polygon key={`ground-${plot.key}`} points={plotPoints(plot)} fill={`url(#ground-${plot.ground})`} />
        ))}
        {checkerTiles.map(([x, y]) => (
          <polygon key={tileKey(x, y)} points={tilePoints(x, y)} fill={groundOf(x, y).tile[(x + y) % 2]} />
        ))}
        {pathTiles.map(([x, y]) => (
          <polygon
            key={`path-${x},${y}`}
            points={tilePoints(x, y)}
            fill={pathFill}
            stroke={pathArt ? pathFill : undefined}
            strokeWidth={pathArt ? 1 : undefined}
          />
        ))}
        {pathLines.length > 0 && (
          <>
            {edge.band && (
              <>
                <clipPath id="road-inner-clip">
                  {pathTiles.map(([x, y]) => (
                    <polygon key={`clip-${x},${y}`} points={tilePoints(x, y)} />
                  ))}
                </clipPath>
                <g
                  clipPath="url(#road-inner-clip)"
                  stroke={edge.band}
                  strokeWidth={edge.bandWidth * 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {pathLines.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
              </>
            )}
            {marks && (
              <g fill="none" stroke="#fffdf5" strokeOpacity={0.88} strokeLinecap="butt">
                {marks.center.map((d, i) => (
                  <path key={`center-${i}`} d={d} strokeWidth={1.4} strokeDasharray="4 3" />
                ))}
                {marks.crossings.map((d, i) => (
                  <path key={`cross-${i}`} d={d} strokeWidth={1.8} />
                ))}
              </g>
            )}
            <g
              stroke={edge.line}
              strokeOpacity={edge.lineOpacity}
              strokeWidth={edge.lineWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              {pathLines.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </>
        )}
        {blendLayers.map((layer, i) => {
          const art = GROUND_ART[layer.kind];
          const fallback = BLEND_FALLBACK[layer.kind];
          return (
            <rect
              key={`blend-${i}`}
              x={vb.x}
              y={vb.y}
              width={vb.width}
              height={vb.height}
              fill={art ? `url(#ground-${layer.kind})` : fallback.color}
              fillOpacity={art ? 1 : fallback.opacity}
              mask={`url(#blend-mask-${i})`}
            />
          );
        })}
        {decals.map(({ key, kind, x, y }) => {
          const decal = GROUND_DECALS[kind];
          const { sx, sy } = tileCenter(x, y);
          const { dx, dy } = decalOffset(x, y);
          // 草・石などは、立てて(つぶさずに)小さく置く。足元がマスの中心にくる
          const width = 20;
          const height = (width * decal.height) / decal.width;
          return (
            <image
              key={key}
              href={decal.src}
              x={sx + dx - width / 2}
              y={sy + dy - height * 0.8}
              width={width}
              height={height}
            />
          );
        })}

        {theme.groundTint && (
          <g fill={theme.groundTint.color} opacity={theme.groundTint.opacity}>
            {landShapes.map((points, i) => (
              <polygon key={i} points={points} />
            ))}
          </g>
        )}

        {gardenGlow && (
          <polygon
            points={tilePoints(garden.x, garden.y)}
            fill="#ffe27a"
            stroke="#d99a12"
            strokeWidth={1.5}
            className="animate-tile-pulse"
          />
        )}

        {placing &&
          [...validTiles].map((key) => {
            const [x, y] = key.split(",").map(Number);
            return (
              <polygon
                key={`valid-${key}`}
                points={tilePoints(x, y)}
                fill="#ffe27a"
                stroke="#d99a12"
                strokeWidth={1.5}
                className="animate-tile-pulse"
              />
            );
          })}

        {previewTiles.map(([x, y]) => (
          <polygon key={`preview-${x},${y}`} points={tilePoints(x, y)} fill="#9fd8ff" stroke="#3a8fc9" strokeWidth={1.5} />
        ))}

        {lockedPlots.map((plot) => (
          <Clouds key={`cloud-${plot.key}`} plot={plot} area={cloudArea(land, plot)} />
        ))}

        {objects.map((o) => {
          const { sx, sy } = o;
          const hopping = o.kind === "companion" && companionTalk?.key === o.companion.key;
          return (
            <g key={o.id} transform={`translate(${sx} ${sy})`}>
              {o.kind === "landmark" && (
                <>
                  <g style={artStyle}>
                    {o.landmarkKey === "garden" ? (
                      <GardenArt state={garden.state} look={garden.look} />
                    ) : (
                      <LandmarkArt landmarkKey={o.landmarkKey} footprint={o.footprint} />
                    )}
                  </g>
                  {theme.lit &&
                    lightCircles(o.landmarkKey, o.footprint).map((light, index) => (
                      <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
                    ))}
                </>
              )}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <g style={artStyle}>
                    <ItemArt assetKey={o.item.asset_key} />
                  </g>
                  {theme.lit &&
                    lightCircles(o.item.asset_key, o.item.footprint).map((light, index) => (
                      <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
                    ))}
                </g>
              )}
              {o.kind === "companion" && (
                <CompanionFigure
                  key={hopping ? `hop-${companionTalk?.at}` : "idle"}
                  companionKey={o.companion.key}
                  delay={o.index * 0.5}
                  quiet={quiet}
                  hopping={hopping}
                  partner={o.companion.is_partner}
                  review={reviewGiver === o.companion.key}
                />
              )}
              {o.kind === "spru" && (
                <>
                  <g key={spru.image} className={spruMotion}>
                    <image href={spruAsset.src} x={spruX} y={spruY} width={spruW} height={spruH} />
                    {bloom && spruBloom && (
                      <image
                        href={SPRU_BLOOM[bloom].src}
                        x={spruX + spruBloom.x * TOWN_SCALE}
                        y={spruY + spruBloom.y * TOWN_SCALE}
                        width={spruBloom.width * TOWN_SCALE}
                        height={spruBloom.height * TOWN_SCALE}
                      />
                    )}
                  </g>
                  {reviewGiver === "spru" && <ReviewMark x={spruX + spruW - 4} y={spruY + 8} quiet={quiet} />}
                </>
              )}
            </g>
          );
        })}

        {spru.sleeping && house && <SleepMark x={houseCenter.sx + 14} y={houseCenter.sy - 86} quiet={quiet} />}

        {preview && previewCenter && (
          <g transform={`translate(${previewCenter.sx} ${previewCenter.sy})`} opacity={0.6}>
            <ItemArt assetKey={preview.item.asset_key} />
          </g>
        )}

        {veiledPlots.map((plot) => (
          <Clouds key={`veil-${plot.key}`} plot={plot} area={cloudArea(land, plot)} className={veil?.fading ? "animate-cloud-clear" : undefined} />
        ))}
      </svg>

      {placing &&
        [...validTiles].map((key) => {
          const [x, y] = key.split(",").map(Number);
          const { sx, sy } = tileCenter(x, y);
          return (
            <button
              key={`tile-${key}`}
              type="button"
              aria-label={`横${x + 1}・縦${y + 1}のマスに置く`}
              onClick={() => onTileTap(x, y)}
              className="absolute focus-visible:outline-3 focus-visible:outline-[#f2b632]"
              style={{
                ...boxStyle(sx, sy, HALF_W, HALF_H, HALF_H),
                clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
              }}
            />
          );
        })}

      {tapTargets.map((target) => {
        return (
          <button
            key={target.id}
            type="button"
            aria-label={target.label}
            onClick={target.onTap}
            data-spru={target.spru ? "" : undefined}
            className="absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]"
            style={boxStyle(target.sx, target.sy, target.halfWidth, target.up, target.down)}
          />
        );
      })}

      {lockedPlots.map((plot) => {
        const { sx, sy } = plotCenter(plot);
        const pos = toPercent(sx, sy - 10, vb);
        const style = { left: `${pos.left}%`, top: `${pos.top}%` };
        const className =
          "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,250,240,0.95)] px-3 py-1 text-[12px] font-black whitespace-nowrap text-[#5a4526] shadow-[0_2px_6px_rgba(59,50,38,0.16)]";
        const text = <AutoFurigana text={cloudLabel(plot)} />;
        return readOnly || !onCloudTap ? (
          <span key={`cloud-label-${plot.key}`} className={`pointer-events-none ${className}`} style={style}>
            {text}
          </span>
        ) : (
          <button
            key={`cloud-label-${plot.key}`}
            type="button"
            disabled={placing}
            onClick={() => onCloudTap(plot)}
            aria-label={`${plot.name}(レベル${plot.min_level}で解放)`}
            className={`${className} focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none`}
            style={style}
          >
            {text}
          </button>
        );
      })}

      {/* 寝ているスプルは家の中にいる(町には出ない)ので、押す範囲も、吹き出しも出さない。起こすのは、家の中の部屋でタップする */}
      {!spru.sleeping && (
        <button
          type="button"
          data-spru
          aria-label="スプル"
          disabled={placing}
          onClick={onSpruTap}
          className="absolute rounded-full focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none"
          style={boxStyle(spruCenter.sx, spruCenter.sy, 20, 60, 6)}
        />
      )}

      {/* 吹き出しは、上に重ねるにぎやか度の飾りや季節の舞うものより手前に出す */}
      {!spru.sleeping && (
        <div
          className="pointer-events-none absolute z-10 flex max-w-[240px] -translate-x-[18%] -translate-y-full items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-1.5 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
          style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
          aria-live="polite"
        >
          <SpruFace face={spru.face} size={28} />
          <span>
            <AutoFurigana text={spru.line} />
          </span>
          <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      )}

      {/* 仲間の吹き出しは、隣に立つスプルの吹き出しより手前に出す */}
      {talking && talkPos && companionTalk && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[172px] -translate-x-1/2 -translate-y-full rounded-xl bg-white px-2.5 py-1 text-[11.5px] leading-snug font-bold text-[#3b3226] shadow-[0_2px_8px_rgba(59,50,38,0.16)]"
          style={{ left: `${talkPos.left}%`, top: `${talkPos.top}%` }}
          aria-live="polite"
        >
          <span className="mr-1 text-[#2e6b1c]">{talking.name}</span>
          <AutoFurigana text={companionTalk.line} />
        </div>
      )}
    </div>
  );
}

// 仲間はタップしたときだけ跳ねる。夜は静かにゆれない(動きを減らす設定はCSSで止まる)
function CompanionFigure({
  companionKey,
  delay,
  quiet,
  hopping,
  partner,
  review,
}: {
  companionKey: CompanionKey;
  delay: number;
  quiet: boolean;
  hopping: boolean;
  partner: boolean;
  review: boolean;
}) {
  const asset = COMPANION_IMAGES[companionKey];
  const width = asset.width * TOWN_SCALE;
  const height = asset.height * TOWN_SCALE;
  const motion = hopping ? "animate-spru-hop" : quiet ? undefined : "animate-spru-bob";
  return (
    <>
      <g
        className={motion}
        style={motion === "animate-spru-bob" ? { animationDuration: "3.2s", animationDelay: `${delay}s` } : undefined}
      >
        <image href={asset.src} x={-width / 2} y={-height + 2} width={width} height={height} />
      </g>
      {partner && <PartnerTag />}
      {review && <ReviewMark x={width / 2 - 2} y={-height + 10} quiet={quiet} />}
    </>
  );
}

// 相棒の足元の札(設計書5-1)
function PartnerTag() {
  return (
    <g transform="translate(0 7)">
      <rect x={-13} y={-5.5} width={26} height={11} rx={5.5} fill="#3b7f26" stroke="#fff" strokeWidth={1} />
      <text y={3} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#fff">
        <AutoFurigana text="相棒" />
      </text>
    </g>
  );
}

// 復習を出す人の頭の上の「！」。CSSの動きがtransform属性を上書きしないよう、位置と動きの<g>を分ける
function ReviewMark({ x, y, quiet }: { x: number; y: number; quiet: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={quiet ? undefined : "animate-spru-bob"} style={quiet ? undefined : { animationDuration: "1.2s" }}>
        <circle r={7.5} fill="#f28c28" stroke="#fff" strokeWidth={1.5} />
        <text y={3.8} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">
          !
        </text>
      </g>
    </g>
  );
}

/** スプルの家の上の「z z z」。スプルが家の中で寝ているしるし(静かにしたいときは動かさない) */
function SleepMark({ x, y, quiet }: { x: number; y: number; quiet: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <g className={quiet ? undefined : "animate-spru-bob"}>
        <text fontSize={12} fontWeight={900} fill="#ffffff" stroke="#5a4526" strokeWidth={0.6} paintOrder="stroke" x={0} y={0}>
          z
        </text>
        <text fontSize={16} fontWeight={900} fill="#ffffff" stroke="#5a4526" strokeWidth={0.7} paintOrder="stroke" x={9} y={-9}>
          z
        </text>
        <text fontSize={20} fontWeight={900} fill="#ffffff" stroke="#5a4526" strokeWidth={0.8} paintOrder="stroke" x={20} y={-20}>
          z
        </text>
      </g>
    </g>
  );
}
