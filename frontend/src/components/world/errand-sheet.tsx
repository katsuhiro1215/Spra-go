"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";
import { SpruFace } from "@/components/spru/spru-figure";

import { errandLine, errandProgressText, errandTitle, isErrandDone } from "./errands";
import type { WorldErrand, WorldErrands } from "./types";

/** ［おつかい］で下から出るカード(設計書5-2) */
export function ErrandSheet({
  errands,
  busy,
  onClaim,
  onGo,
  onClose,
}: {
  errands: WorldErrands;
  busy: boolean;
  onClaim: (errand: WorldErrand) => void;
  onGo: (errand: WorldErrand) => void;
  onClose: () => void;
}) {
  // 右下の音・ふりがなのボタン(z-50)が右端の［受け取る］に重ならないよう、その上に出す
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="errand-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="errand-sheet-title" className="text-lg font-black">
          <AutoFurigana text="今日のおつかい" />
        </h2>
        <ul className="flex flex-col gap-2">
          {errands.items.map((errand) => (
            <ErrandRow
              key={errand.slot}
              errand={errand}
              busy={busy}
              onClaim={() => onClaim(errand)}
              onGo={() => onGo(errand)}
            />
          ))}
        </ul>
        <p className="text-center text-sm font-bold text-[#8a6a1c]">
          <AutoFurigana text={errands.bonus.claimed ? "おまけも受け取ったよ" : `3つそろうと おまけ +${errands.bonus.amount}pt`} />
        </p>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}

function ErrandRow({
  errand,
  busy,
  onClaim,
  onGo,
}: {
  errand: WorldErrand;
  busy: boolean;
  onClaim: () => void;
  onGo: () => void;
}) {
  const shown = Math.min(errand.progress, errand.target);
  return (
    <li className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_2px_6px_rgba(59,50,38,0.08)]">
      <GiverFace errand={errand} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[11.5px] font-bold break-all text-[#6b5d45]">
          <AutoFurigana text={`${errand.giver.name}「${errandLine(errand)}」`} />
        </p>
        <p className="text-sm font-black">
          <AutoFurigana text={errandTitle(errand)} />
        </p>
        <div className="flex items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-[#efe5cf]"
            role="progressbar"
            aria-label={errandTitle(errand)}
            aria-valuemin={0}
            aria-valuemax={errand.target}
            aria-valuenow={shown}
          >
            <div className="h-2 rounded-full bg-[#5bb33e]" style={{ width: `${Math.round((shown / errand.target) * 100)}%` }} />
          </div>
          <span className="text-xs font-black text-[#6b5d45]">{errandProgressText(errand)}</span>
        </div>
      </div>
      {errand.claimed ? (
        <span className="shrink-0 text-xs font-black text-[#3b7f26]">
          <AutoFurigana text="受け取ったよ" />
        </span>
      ) : isErrandDone(errand) ? (
        <button
          type="button"
          disabled={busy}
          onClick={onClaim}
          className="h-10 shrink-0 rounded-xl bg-[#f28c28] px-3 text-sm font-black text-white shadow-[0_3px_0_#c46a12] disabled:opacity-60"
        >
          <AutoFurigana text="受け取る" />
        </button>
      ) : (
        <button type="button" onClick={onGo} className="h-10 shrink-0 rounded-xl bg-[#efe5cf] px-3 text-sm font-black">
          <AutoFurigana text="やりに行く" />
        </button>
      )}
    </li>
  );
}

function GiverFace({ errand }: { errand: WorldErrand }) {
  if (errand.giver.kind === "partner" && errand.giver.key) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#f5efe1]">
        <CompanionImage companionKey={errand.giver.key} standHeight={52} />
      </span>
    );
  }
  return <SpruFace face="happy" size={40} />;
}
