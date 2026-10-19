import { Check, Eraser, Hand, Redo2, Route, Undo2, type LucideIcon } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";

import type { RoadTool } from "./road-edit";

export type RoadMode = RoadTool | "move";

const BUTTON =
  "flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-black text-[#3b3226] focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:opacity-35";

function ToolButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`${BUTTON} ${active ? "bg-[#d9f0c9] text-[#2e6b1c]" : ""}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span>
        <AutoFurigana text={label} />
      </span>
    </button>
  );
}

/** 道をつくる道具(docs/design/2026-10-19-town-roads-design.md 3-1)。画面の下、右下の丸いボタン・下のメニューより上に出す */
export function RoadToolbar({
  mode,
  canUndo,
  canRedo,
  onMode,
  onUndo,
  onRedo,
  onDone,
  note = null,
}: {
  /** 引けなかったときなどの短いお知らせ */
  note?: string | null;
  mode: RoadMode;
  canUndo: boolean;
  canRedo: boolean;
  onMode: (mode: RoadMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}) {
  return (
    <>
      {note && (
        <p
          role="status"
          className="fixed right-0 bottom-[214px] left-0 z-30 mx-auto w-fit max-w-[calc(100vw-32px)] rounded-full bg-[#fdebe5] px-3 py-1.5 text-[12.5px] font-bold text-[#a33a22] shadow-[0_2px_8px_rgba(59,50,38,0.2)]"
        >
          {note}
        </p>
      )}
      <div
      role="toolbar"
      aria-label="道をつくる道具"
      className="fixed right-0 bottom-[150px] left-0 z-30 mx-auto flex w-fit max-w-[calc(100vw-16px)] items-center gap-0.5 rounded-2xl bg-[rgba(255,250,240,0.97)] px-1.5 py-1 shadow-[0_4px_14px_rgba(59,50,38,0.25)]"
    >
      <ToolButton icon={Route} label="ひく" active={mode === "draw"} onClick={() => onMode("draw")} />
      <ToolButton icon={Eraser} label="けす" active={mode === "erase"} onClick={() => onMode("erase")} />
      <ToolButton icon={Hand} label="うごかす" active={mode === "move"} onClick={() => onMode("move")} />
      <span aria-hidden className="mx-0.5 h-8 w-px bg-[#e8dfcf]" />
      <ToolButton icon={Undo2} label="もどす" disabled={!canUndo} onClick={onUndo} />
      <ToolButton icon={Redo2} label="やりなおす" disabled={!canRedo} onClick={onRedo} />
      <span aria-hidden className="mx-0.5 h-8 w-px bg-[#e8dfcf]" />
      <ToolButton icon={Check} label="おわる" onClick={onDone} />
      </div>
    </>
  );
}
