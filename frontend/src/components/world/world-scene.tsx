"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ItemArt } from "./item-art";
import { LandmarkArt } from "./landmark-art";
import type { WorldItem, WorldLand } from "./types";

type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; landmarkKey: string }
  | { kind: "item"; id: string; x: number; y: number; item: WorldItem }
  | { kind: "spru"; id: string; x: number; y: number };

export function WorldScene({
  land,
  items,
  validTiles,
  placing,
  onTileTap,
  onItemTap,
  spruMood,
  spruLine,
  poppedItemId,
}: {
  land: WorldLand;
  items: WorldItem[];
  validTiles: Set<string>;
  placing: boolean;
  onTileTap: (x: number, y: number) => void;
  onItemTap: (item: WorldItem) => void;
  spruMood: "idle" | "joy";
  spruLine: string;
  poppedItemId: number | null;
}) {
  const vb = sceneViewBox(land.size);
  const n = land.size;
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);

  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) tiles.push({ x, y });
  }

  // 奥(x+yが小さい)から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({ kind: "landmark" as const, id: `landmark-${i}`, x: l.x, y: l.y, landmarkKey: l.key })),
    ...placed.map((item) => ({ kind: "item" as const, id: `item-${item.id}`, x: item.x, y: item.y, item })),
    { kind: "spru" as const, id: "spru", x: land.spru.x, y: land.spru.y },
  ].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

  const left = { x: -n * HALF_W, y: n * HALF_H };
  const bottom = { x: 0, y: n * HALF_H * 2 };
  const right = { x: n * HALF_W, y: n * HALF_H };
  const spru = tileCenter(land.spru.x, land.spru.y);
  const bubble = toPercent(spru.sx, spru.sy - 60, vb);

  const boxStyle = (sx: number, sy: number, halfWidth: number, up: number, down: number) => {
    const topLeft = toPercent(sx - halfWidth, sy - up, vb);
    return {
      left: `${topLeft.left}%`,
      top: `${topLeft.top}%`,
      width: `${((halfWidth * 2) / vb.width) * 100}%`,
      height: `${((up + down) / vb.height) * 100}%`,
    };
  };

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
          return (
            <g key={o.id} transform={`translate(${sx} ${sy})`}>
              {o.kind === "landmark" && <LandmarkArt landmarkKey={o.landmarkKey} />}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <ItemArt assetKey={o.item.asset_key} />
                </g>
              )}
              {o.kind === "spru" &&
                (spruMood === "joy" ? (
                  <image href="/spru/joy.png" x={-32} y={-60} width={64} height={62} className="animate-spru-hop" />
                ) : (
                  <image href="/spru/idle.png" x={-16} y={-55} width={31} height={55} className="animate-spru-bob" />
                ))}
            </g>
          );
        })}
      </svg>

      {placing
        ? [...validTiles].map((key) => {
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
          })
        : placed.map((item) => {
            const { sx, sy } = tileCenter(item.x, item.y);
            return (
              <button
                key={`item-button-${item.id}`}
                type="button"
                aria-label={`${item.name}(動かす・しまう)`}
                onClick={() => onItemTap(item)}
                className="absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]"
                style={boxStyle(sx, sy, HALF_W - 4, 56, 14)}
              />
            );
          })}

      <div
        className="pointer-events-none absolute max-w-[62%] -translate-x-[18%] -translate-y-full rounded-2xl bg-white px-3 py-2 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
        style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
        aria-live="polite"
      >
        <AutoFurigana text={spruLine} />
        <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
    </div>
  );
}
