"use client";

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
import { GardenArt } from "./garden-art";
import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ITEM_LIGHTS, ItemArt } from "./item-art";
import { LandmarkArt } from "./landmark-art";
import type { TimeOfDay } from "./time-of-day";
import type { WorldCompanion, WorldGarden, WorldItem, WorldLand } from "./types";

// 町の中のスプルの立ち姿の高さ(SVGの単位)。座る・寝る・仲間は素材集の縮尺どおりにそろえる
const TOWN_STAND_HEIGHT = 58;
const TOWN_SCALE = TOWN_STAND_HEIGHT / SPRU_STAND_HEIGHT;

type PlacedCompanion = WorldCompanion & { key: CompanionKey; x: number; y: number };

type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; landmarkKey: string }
  | { kind: "item"; id: string; x: number; y: number; item: WorldItem }
  | { kind: "companion"; id: string; x: number; y: number; companion: PlacedCompanion; index: number }
  | { kind: "spru"; id: string; x: number; y: number };

type TapTarget = {
  id: string;
  x: number;
  y: number;
  label: string;
  onTap: () => void;
  halfWidth: number;
  up: number;
  down: number;
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
  companions,
  onCompanionTap,
  companionTalk,
  reviewGiver,
  quiet,
  readOnly = false,
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
  companions: WorldCompanion[];
  onCompanionTap: (key: string) => void;
  companionTalk: { key: string; at: number; line: string } | null;
  reviewGiver: string | null;
  quiet: boolean;
  readOnly?: boolean;
}) {
  const theme = TIME_THEME[timeOfDay];
  // 夜は物を少し暗くする(明かりは暗くしない)
  const artStyle = theme.dimObjects ? { filter: "brightness(0.78) saturate(0.85)" } : undefined;
  const vb = sceneViewBox(land.size);
  const n = land.size;
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) tiles.push({ x, y });
  }

  // 奥から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({ kind: "landmark" as const, id: `landmark-${i}`, x: l.x, y: l.y, landmarkKey: l.key })),
    ...placed.map((item) => ({ kind: "item" as const, id: `item-${item.id}`, x: item.x, y: item.y, item })),
    ...placedCompanions.map((companion, index) => ({
      kind: "companion" as const,
      id: `companion-${companion.key}`,
      x: companion.x,
      y: companion.y,
      companion,
      index,
    })),
    { kind: "spru" as const, id: "spru", x: land.spru.x, y: land.spru.y },
  ].sort(byDepth);

  const left = { x: -n * HALF_W, y: n * HALF_H };
  const bottom = { x: 0, y: n * HALF_H * 2 };
  const right = { x: n * HALF_W, y: n * HALF_H };
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
    : placed.map((item) => ({
        id: `item-button-${item.id}`,
        x: item.x,
        y: item.y,
        label: `${item.name}(動かす・しまう)`,
        onTap: () => onItemTap(item),
        halfWidth: HALF_W - 4,
        up: 56,
        down: 14,
      }));
  const gardenTarget: TapTarget[] = readOnly
    ? []
    : [{ id: "garden-button", x: garden.x, y: garden.y, label: "畑", onTap: onGardenTap, halfWidth: 22, up: 36, down: 12 }];
  const tapTargets: TapTarget[] = placing
    ? []
    : [
        ...itemTargets,
        ...placedCompanions.map((c) => ({
          id: `companion-button-${c.key}`,
          x: c.x,
          y: c.y,
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
        <polygon
          points={`${left.x},${left.y + 50} ${bottom.x},${bottom.y + 50} ${right.x},${right.y + 50} 0,50`}
          fill="#62b8d6"
          opacity={0.55}
        />
        <polygon
          points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS}`}
          fill="#d7a574"
        />
        <polygon
          points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS}`}
          fill="#bf8a5b"
        />
        <polygon points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + 7} ${left.x},${left.y + 7}`} fill="#86c56d" />
        <polygon points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + 7} ${bottom.x},${bottom.y + 7}`} fill="#74b35d" />
        <path
          d={`M${left.x} ${left.y + LAND_THICKNESS} L${bottom.x} ${bottom.y + LAND_THICKNESS} L${right.x} ${right.y + LAND_THICKNESS}`}
          stroke="#e6f7fb"
          strokeWidth={3}
          fill="none"
        />

        {tiles.map(({ x, y }) => {
          const key = tileKey(x, y);
          const fill = pathSet.has(key) ? "#f1dfbb" : (x + y) % 2 === 0 ? "#b4e19b" : "#a9da8e";
          return <polygon key={key} points={tilePoints(x, y)} fill={fill} />;
        })}

        {theme.groundTint && (
          <polygon
            points={`0,0 ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS} ${left.x},${left.y}`}
            fill={theme.groundTint.color}
            opacity={theme.groundTint.opacity}
          />
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

        {objects.map((o) => {
          const { sx, sy } = tileCenter(o.x, o.y);
          const hopping = o.kind === "companion" && companionTalk?.key === o.companion.key;
          return (
            <g key={o.id} transform={`translate(${sx} ${sy})`}>
              {o.kind === "landmark" && (
                <g style={artStyle}>
                  {o.landmarkKey === "garden" ? (
                    <GardenArt state={garden.state} />
                  ) : (
                    <LandmarkArt landmarkKey={o.landmarkKey} lit={theme.lit} />
                  )}
                </g>
              )}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <g style={artStyle}>
                    <ItemArt assetKey={o.item.asset_key} />
                  </g>
                  {theme.lit && o.item.asset_key && ITEM_LIGHTS[o.item.asset_key] && (
                    <circle
                      cx={ITEM_LIGHTS[o.item.asset_key].cx}
                      cy={ITEM_LIGHTS[o.item.asset_key].cy}
                      r={ITEM_LIGHTS[o.item.asset_key].r}
                      fill="#ffd98a"
                      opacity={0.5}
                    />
                  )}
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
        const { sx, sy } = tileCenter(target.x, target.y);
        return (
          <button
            key={target.id}
            type="button"
            aria-label={target.label}
            onClick={target.onTap}
            className="absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]"
            style={boxStyle(sx, sy, target.halfWidth, target.up, target.down)}
          />
        );
      })}

      <button
        type="button"
        data-spru
        aria-label="スプル"
        disabled={placing}
        onClick={onSpruTap}
        className="absolute rounded-full focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none"
        style={boxStyle(spruCenter.sx, spruCenter.sy, 20, 60, 6)}
      />

      <div
        className="pointer-events-none absolute flex max-w-[66%] -translate-x-[18%] -translate-y-full items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-1.5 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
        style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
        aria-live="polite"
      >
        <SpruFace face={spru.face} size={28} />
        <span>
          <AutoFurigana text={spru.line} />
        </span>
        <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>

      {/* 仲間の吹き出しは、隣に立つスプルの吹き出しより手前に出す */}
      {talking && talkPos && companionTalk && (
        <div
          className="pointer-events-none absolute w-max max-w-[48%] -translate-x-1/2 -translate-y-full rounded-xl bg-white px-2.5 py-1 text-[11.5px] leading-snug font-bold text-[#3b3226] shadow-[0_2px_8px_rgba(59,50,38,0.16)]"
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
        相棒
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
