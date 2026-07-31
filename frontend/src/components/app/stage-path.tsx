"use client";

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
    <div className="flex flex-col items-center gap-3 py-2">
      {stages.map((stage, index) => {
        const playable =
          !stage.locked &&
          (stage.assigned_count === undefined || stage.assigned_count > 0);
        const isNext = index === nextPlayableIndex;
        const isSelected = selectedId === stage.id;
        // S字を描くように左右へ揺らす(蛇行パス)
        const offset = Math.round(Math.sin(index * (Math.PI / 2)) * 44);

        let icon = "⭐";
        if (stage.locked) icon = "🔒";
        else if (stage.cleared) icon = "✓";
        else if (stage.is_boss) icon = "👑";

        let colorClasses =
          "border-amber-500 bg-amber-400 text-white";
        if (isSelected) {
          colorClasses = "border-sky-600 bg-sky-400 text-white ring-4 ring-sky-300";
        } else if (stage.locked) {
          colorClasses = "border-neutral-400 bg-neutral-200 text-neutral-500";
        } else if (stage.cleared) {
          colorClasses = "border-green-600 bg-green-400 text-white";
        } else if (stage.is_boss) {
          colorClasses = "border-rose-600 bg-rose-400 text-white";
        }

        const label = stage.locked
          ? `ステージ${stage.stage_number}(ロック中)`
          : `ステージ${stage.stage_number}${stage.is_boss ? "・ボス" : ""}${
              stage.cleared ? "・クリア済み" : ""
            }`;

        return (
          <div
            key={stage.id}
            className="relative"
            style={{ transform: `translateX(${offset}px)` }}
          >
            {isNext && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce rounded-full border-2 border-sky-400 bg-white px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-sky-500 shadow">
                START
              </div>
            )}
            <button
              type="button"
              disabled={!playable}
              onClick={() => onSelect(stage)}
              aria-label={label}
              title={label}
              className={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full border-b-4 text-xl font-bold shadow-lg transition-transform disabled:cursor-not-allowed disabled:opacity-70 ${
                playable
                  ? "hover:scale-105 active:translate-y-0.5 active:border-b-0"
                  : ""
              } ${colorClasses}`}
            >
              <span aria-hidden>{icon}</span>
              <span className="text-[10px] font-medium opacity-90">
                {stage.stage_number}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
