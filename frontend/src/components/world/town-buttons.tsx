import Link from "next/link";
import { Backpack, Sprout } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

import { claimableErrands, claimedCount } from "./errands";
import { livelinessStars, type Liveliness } from "./liveliness";
import type { WorldErrands } from "./types";

const PILL =
  "relative flex h-9 items-center gap-1 rounded-full bg-[rgba(255,250,240,0.94)] px-2.5 text-[12px] font-black text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.12)] focus-visible:outline-3 focus-visible:outline-[#f2b632]";

/** 町の名前の札の下に並べるボタン(設計書5-1) */
export function TownButtons({
  errands,
  lively,
  familyCount,
  onErrands,
  onLiveliness,
  onRoster,
}: {
  errands: WorldErrands;
  lively: Liveliness;
  familyCount: number;
  onErrands: () => void;
  onLiveliness: () => void;
  onRoster: () => void;
}) {
  const claimable = claimableErrands(errands).length > 0;
  const count = `${claimedCount(errands)}/${errands.items.length}`;
  // ふりがなの部品は漢字の所で分かれるので、横並びのすき間が入らないよう span で包む
  return (
    <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1 px-2">
      <button
        type="button"
        onClick={onErrands}
        className={PILL}
        aria-label={`今日のおつかい ${count}${claimable ? "、受け取れるものがあるよ" : ""}`}
      >
        <Backpack className="h-3.5 w-3.5 text-[#3b7f26]" aria-hidden />
        <span>
          <AutoFurigana text="おつかい" />
        </span>
        <span>{count}</span>
        {claimable && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f28c28] text-[10px] font-black text-white"
          >
            !
          </span>
        )}
      </button>
      <button type="button" onClick={onLiveliness} className={PILL} aria-label={`にぎやか度 ${lively.label}`}>
        <span>
          <AutoFurigana text="にぎやか度" />
        </span>
        <span className="text-[#e0a100]">{livelinessStars(lively.level)}</span>
      </button>
      <button type="button" onClick={onRoster} className={PILL} aria-label="なかまの一覧">
        <Sprout className="h-3.5 w-3.5 text-[#3b7f26]" aria-hidden />
        <span>
          <AutoFurigana text="なかま" />
        </span>
      </button>
      {familyCount > 0 && (
        <Link href="/family" className={PILL}>
          <AssetImage asset={SPRU_ICONS.family} size={24} />
          <span>
            <AutoFurigana text="家族の町" />
          </span>
        </Link>
      )}
    </div>
  );
}
