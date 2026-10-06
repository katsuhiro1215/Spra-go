"use client";

import { useEffect, useId, useState } from "react";

import { AssetImage } from "@/components/app/asset-image";
import { BadgeImage } from "@/components/app/badge-image";
import { stageNodeClasses, stageNodeImage } from "@/components/app/stage-node";
import type { StagePathNode } from "@/components/app/stage-path";
import { OUTING_IMAGES, SPRU_STAGES } from "@/components/spru/spru-assets";
import { GROUND_ART, type GroundArt } from "@/components/world/ground-art";
import { prefersReducedMotion } from "@/lib/motion";
import { roadPath, stageMapLayout, walkerTarget } from "@/lib/stage-map";

const WIDTH = 320;
const ROW = 96;
const ROAD_WIDTH = 52;

/**
 * 国のコース・言語のコースの「ステージの道」(docs/design/2026-10-07-main-game-levels-design.md 4-6)。
 * 国の道の絵(roadSrc)を、曲がる道として敷き、周りは草の地面。スプルは次に遊ぶステージの横に立ち、
 * クリアしたあとに戻ると、前の位置から歩いて動く(walkKey ごとに前回の位置を覚える。動きを減らす設定のときは動かさない)。
 * ステージの丸は StagePath と同じ絵・文言
 */
export function StageMap({
  stages,
  selectedId,
  onSelect,
  roadArt = GROUND_ART.path ?? null,
  walkKey,
}: {
  stages: StagePathNode[];
  selectedId?: number | null;
  onSelect: (stage: StagePathNode) => void;
  roadArt?: GroundArt | null;
  walkKey: string;
}) {
  const patternId = useId();
  const { points, height } = stageMapLayout(stages.length, WIDTH, ROW);
  const target = walkerTarget(stages);
  const grass = GROUND_ART.grass;

  // スプルの位置。前回の位置(同じ道で最後に立っていた番号)があれば、そこから目的の位置へ歩く
  const [standAt, setStandAt] = useState<number | null>(() => {
    const previous = readPrevious(walkKey);
    return target !== null && previous !== null && previous < target && !prefersReducedMotion() ? previous : target;
  });
  useEffect(() => {
    if (target === null) return;
    writePrevious(walkKey, target);
    if (standAt !== target) {
      const frame = requestAnimationFrame(() => setStandAt(target));
      return () => cancelAnimationFrame(frame);
    }
  }, [target, standAt, walkKey]);

  const nextPlayableIndex = stages.findIndex((s) => !s.locked && !s.cleared && (s.assigned_count === undefined || s.assigned_count > 0));
  const walker = standAt !== null ? points[standAt] : null;

  return (
    <div
      className="relative mx-auto max-w-full overflow-hidden rounded-3xl border-2 border-[#e8dfcf]"
      style={{
        width: WIDTH,
        height,
        backgroundColor: "#9ed07a",
        backgroundImage: grass ? `url(${grass.src})` : undefined,
        backgroundSize: grass ? "256px 256px" : undefined,
      }}
    >
      {roadArt && points.length > 1 && (
        <svg aria-hidden className="absolute inset-0" width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width={roadArt.size / 2} height={roadArt.size / 2}>
              <image href={roadArt.src} width={roadArt.size / 2} height={roadArt.size / 2} />
            </pattern>
          </defs>
          <path d={roadPath(points)} fill="none" stroke="#6b5538" strokeWidth={ROAD_WIDTH + 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
          <path d={roadPath(points)} fill="none" stroke={`url(#${patternId})`} strokeWidth={ROAD_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {stages.map((stage, index) => {
        const point = points[index];
        const playable = !stage.locked && (stage.assigned_count === undefined || stage.assigned_count > 0);
        const isNext = index === nextPlayableIndex;
        const isSelected = selectedId === stage.id;
        const image = stageNodeImage(stage);
        const label = stage.locked
          ? `ステージ${stage.stage_number}(ロック中)`
          : `ステージ${stage.stage_number}${stage.is_boss ? "・ボス" : ""}${stage.cleared ? "・クリア済み" : ""}`;
        const press = playable ? "hover:scale-105 active:translate-y-0.5" : "";
        const shape = image
          ? `${isSelected ? "ring-4 ring-[#9fd8ff]" : ""} ${!playable && !stage.locked ? "opacity-70" : ""}`
          : `border-b-4 shadow-lg ${playable ? "active:border-b-0" : ""} ${stageNodeClasses(stage, isSelected)}`;

        return (
          <div key={stage.id} className="absolute" style={{ left: point.x - 32, top: point.y - 32 }}>
            {isNext && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce rounded-full border-2 border-[#2b6fa3] bg-[#fffaf0] px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-[#2b6fa3] shadow">
                START
              </div>
            )}
            <button
              type="button"
              disabled={!playable}
              onClick={() => onSelect(stage)}
              aria-label={label}
              title={label}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-transform disabled:cursor-not-allowed ${press} ${shape}`}
            >
              {image ? <AssetImage asset={SPRU_STAGES[image]} size={64} /> : <BadgeImage badge="boss" size={30} />}
              <span
                aria-hidden
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#fffaf0] px-1.5 text-[10px] leading-4 font-black text-[#3b3226] shadow"
              >
                {stage.stage_number}
              </span>
            </button>
          </div>
        );
      })}

      {walker && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${walker.x + 28}px, ${walker.y - 40}px)`,
            transition: prefersReducedMotion() ? undefined : "transform 900ms ease-in-out",
          }}
        >
          <AssetImage asset={OUTING_IMAGES.walk} size={56} />
        </div>
      )}
    </div>
  );
}

function readPrevious(key: string): number | null {
  try {
    const value = window.localStorage.getItem(`stage-map:${key}`);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function writePrevious(key: string, index: number): void {
  try {
    window.localStorage.setItem(`stage-map:${key}`, String(index));
  } catch {
    // 保存できなくても、スプルが前回の位置から歩かないだけ
  }
}
