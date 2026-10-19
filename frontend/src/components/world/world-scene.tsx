"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import type { Bloom } from "@/components/spru/bloom";
import type { SpruView } from "@/components/spru/mood";
import { COMPANION_IMAGES, type CompanionKey } from "@/components/spru/spru-assets";
import { SpruFace } from "@/components/spru/spru-figure";

import { TIME_THEME } from "./ambience";
import { buildGroundModel, buildSceneModel, groundSignature, type SceneInput } from "./canvas/scene-model";
import { TownCanvas, type RoadControls } from "./canvas/town-canvas";
import { HALF_H, HALF_W, sceneViewBox, tileCenter, toPercent } from "./iso";
import { cloudLabel, depthTile, footprintCenter, landmarkFootprint, plotCenter } from "./land";
import { idleWalker, isWalking, nearestRoute, stepWalker, walkableTiles, walkTo, type Walker } from "./roads/walk";
import type { TimeOfDay } from "./time-of-day";
import type { Tile, WorldCompanion, WorldGarden, WorldItem, WorldLand, WorldPlot } from "./types";

// 町の絵はCanvas(canvas/)で描く。ここでは、その上に重ねる、押せる場所(透明なボタン)・雲の札・吹き出しを作る
// (docs/design/2026-10-19-town-canvas-design.md)

type PlacedCompanion = WorldCompanion & { key: CompanionKey; x: number; y: number };

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
  roads = null,
  visit = null,
  onArrive,
  onWalkStart,
}: {
  /** Spruを、行き先のうちいちばん近いマスまで歩かせる(畑の前)。seq が変わるたびに、新しい依頼。着いたら onArrive(seq) */
  visit?: { seq: number; targets: Tile[] } | null;
  onArrive?: (seq: number) => void;
  /** 町のマスをタップして、自分で歩かせたとき(畑の用事をやめる合図) */
  onWalkStart?: () => void;
  /** 道を引く道具が出ている間の操作。あるときは、押せる場所(透明ボタン)を止める */
  roads?: RoadControls | null;
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
  // 道の道具が出ている間は、アイテム・家・畑・仲間・スプル・雲の札を押せなくする(間違えて開かないように)
  const lock = roads ? "pointer-events-none " : "";
  const vb = sceneViewBox(land.width, land.height);

  // Spruが歩く(docs/design/2026-10-19-town-roads-design.md 3-2)。位置は、この画面の中だけで持ち、保存しない。
  // 歩くたびに地図全体を作り直さないよう、歩く状態は、この部品の中に置く
  const home = land.spru;
  const [walker, setWalker] = useState<Walker>(() => idleWalker(home.x, home.y));
  // 家で寝るときは、いつもの場所に戻す(起きたときに、そこに出る)
  const [wasSleeping, setWasSleeping] = useState(spru.sleeping);
  if (wasSleeping !== spru.sleeping) {
    setWasSleeping(spru.sleeping);
    if (spru.sleeping) setWalker(idleWalker(home.x, home.y));
  }
  const walkable = useMemo(() => walkableTiles(land, items, companions), [land, items, companions]);
  const walking = isWalking(walker);
  useEffect(() => {
    if (!walking) return;
    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setWalker((w) => stepWalker(w, dt));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [walking]);
  const spruAt = spru.sleeping ? home : walker;

  function handleTileClick(x: number, y: number) {
    if (readOnly || placing || roads || spru.sleeping || !walkable(x, y)) return;
    onWalkStart?.();
    setWalker((w) => walkTo(w, [x, y], walkable));
  }

  // 畑の前への依頼: 新しい seq のとき、いちばん近い行き先へ歩かせる(描いている最中に状態を直す書き方。着いたかは下の effect が見る)
  const [handledSeq, setHandledSeq] = useState(visit?.seq ?? 0);
  const [pendingSeq, setPendingSeq] = useState<number | null>(null);
  if (visit && visit.seq !== handledSeq) {
    setHandledSeq(visit.seq);
    setPendingSeq(visit.seq);
    const head = walker.path[0];
    const from: Tile = head ?? [Math.round(walker.x), Math.round(walker.y)];
    const route = nearestRoute(from, visit.targets, walkable);
    if (route && route.path.length > 0) setWalker((w) => walkTo(w, route.target, walkable));
  }
  const arrivedSeq = useRef<number | null>(null);
  useEffect(() => {
    if (pendingSeq === null || walking || arrivedSeq.current === pendingSeq) return;
    arrivedSeq.current = pendingSeq;
    onArrive?.(pendingSeq);
  }, [pendingSeq, walking, onArrive]);

  const sceneInput: SceneInput = {
    land,
    items,
    companions,
    garden,
    spru,
    bloom,
    theme,
    roadStyle,
    validTiles,
    placing,
    preview,
    veil,
    reviewGiver,
    readOnly,
    walker: spru.sleeping ? null : { x: walker.x, y: walker.y, dir: walker.dir, walking },
  };
  // 地面は、アイテム・道・区画・時間帯が変わるときだけ作り直す(props は、画面が変えない間は同じ物)
  const ground = useMemo(
    () => buildGroundModel({ land, items, companions, theme, roadStyle }),
    [land, items, companions, theme, roadStyle],
  );
  const groundKey = useMemo(
    () => groundSignature({ land, items, companions, theme, roadStyle }),
    [land, items, companions, theme, roadStyle],
  );
  const lockedPlots = land.plots.filter((plot) => !plot.unlocked);
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  const at = (x: number, y: number) => ({ x, y, ...tileCenter(x, y) });
  const spruCenter = tileCenter(spruAt.x, spruAt.y);
  // 吹き出しのしっぽがSの先のつぼみ・花に重ならない高さ
  const bubble = toPercent(spruCenter.sx, spruCenter.sy - 72, vb);

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
      <TownCanvas
        model={buildSceneModel(sceneInput, ground)}
        groundKey={groundKey}
        quiet={quiet}
        poppedItemId={poppedItemId}
        spruImage={spru.image}
        companionTalk={companionTalk}
        veilFading={veil?.fading ?? false}
        roads={roads}
        onTileClick={handleTileClick}
      />

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
              className={`${lock}absolute focus-visible:outline-3 focus-visible:outline-[#f2b632]`}
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
            className={`${lock}absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]`}
            style={boxStyle(target.sx, target.sy, target.halfWidth, target.up, target.down)}
          />
        );
      })}

      {lockedPlots.map((plot) => {
        const { sx, sy } = plotCenter(plot);
        const pos = toPercent(sx, sy - 10, vb);
        const style = { left: `${pos.left}%`, top: `${pos.top}%` };
        const className =
          "town-cloud-label absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,250,240,0.95)] px-3 py-1 text-[12px] font-black whitespace-nowrap text-[#5a4526] shadow-[0_2px_6px_rgba(59,50,38,0.16)]";
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
            className={`${lock}${className} focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none`}
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
          className={`${lock}absolute rounded-full focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none`}
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

