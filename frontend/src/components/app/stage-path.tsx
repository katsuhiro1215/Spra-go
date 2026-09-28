"use client";

import { AssetImage } from "@/components/app/asset-image";
import { BadgeImage } from "@/components/app/badge-image";
import { stageNodeClasses, stageNodeImage } from "@/components/app/stage-node";
import { SPRU_STAGES } from "@/components/spru/spru-assets";

export type StagePathNode = {
  id: number;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  cleared: boolean;
  locked: boolean;
  assigned_count?: number;
};

/**
 * ステージ一覧を単純なグリッドではなく、蛇行パス状に配置するコンポーネント。
 * docs/content/test.tsx(Owner提供、過去にDuolingoを参考に作った試作)を参考に、
 * このプロジェクトの技術構成(react-circular-progressbar等は使わない)向けに
 * 作り直したもの。次にプレイできるステージには「START」の吹き出しを表示する。
 * 丸はスプルのバッジの絵で、番号は丸の下の札(docs/design/2026-09-29-spru-icons-design.md 4-4)。まだのボスだけ赤い丸とボスの印
 */
export function StagePath({
  stages,
  selectedId,
  onSelect,
}: {
  stages: StagePathNode[];
  selectedId?: number | null;
  onSelect: (stage: StagePathNode) => void;
}) {
  const nextPlayableIndex = stages.findIndex(
    (s) =>
      !s.locked && !s.cleared && (s.assigned_count === undefined || s.assigned_count > 0),
  );

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {stages.map((stage, index) => {
        const playable =
          !stage.locked &&
          (stage.assigned_count === undefined || stage.assigned_count > 0);
        const isNext = index === nextPlayableIndex;
        const isSelected = selectedId === stage.id;
        // S字を描くように左右へ揺らす(蛇行パス)
        const offset = Math.round(Math.sin(index * (Math.PI / 2)) * 44);
        const image = stageNodeImage(stage);

        const label = stage.locked
          ? `ステージ${stage.stage_number}(ロック中)`
          : `ステージ${stage.stage_number}${stage.is_boss ? "・ボス" : ""}${
              stage.cleared ? "・クリア済み" : ""
            }`;

        const press = playable ? "hover:scale-105 active:translate-y-0.5" : "";
        // 鍵の絵はもう灰色なので薄くしない。問題がなくて押せないステージだけ薄くする
        const shape = image
          ? `${isSelected ? "ring-4 ring-[#9fd8ff]" : ""} ${!playable && !stage.locked ? "opacity-70" : ""}`
          : `border-b-4 shadow-lg ${playable ? "active:border-b-0" : ""} ${stageNodeClasses(stage, isSelected)}`;

        return (
          <div
            key={stage.id}
            className="relative"
            style={{ transform: `translateX(${offset}px)` }}
          >
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
    </div>
  );
}
