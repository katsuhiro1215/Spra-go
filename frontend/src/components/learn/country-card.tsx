import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_STAGES } from "@/components/spru/spru-assets";

import { achievementRatio, achievementText, countryCardLabel, isAllCleared, type LearnCountry } from "./country-cards";

// 学ぶタブの国旗のカード(docs/design/2026-09-29-learn-flag-cards-design.md 3-2・3-3)
const CARD_CLASS =
  "relative flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-b-4 p-3 text-center shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2";

/** カードの国旗(縦横2:3)。国名は下に文字で出すので alt は空 */
function CardFlag({ code, locked = false }: { code: string; locked?: boolean }) {
  return (
    <span
      className={`relative block aspect-[3/2] w-full max-w-28 overflow-hidden rounded-md border border-[#e8dfcf] ${locked ? "opacity-70 grayscale" : ""}`}
    >
      <Image src={`/flag/${code}.svg`} alt="" fill sizes="112px" className="object-cover" />
    </span>
  );
}

/** 着いた国のカード。国旗・国名・進み具合の棒と数。押すとその国の画面へ */
export function ArrivedCountryCard({ country }: { country: LearnCountry }) {
  const text = achievementText(country.achievement);
  return (
    <Link
      href={`/travel/${country.id}/start`}
      aria-label={countryCardLabel(country.name, country.achievement)}
      className={`${CARD_CLASS} border-[#e8dfcf] bg-[#fffaf0] text-[#3b3226] hover:-translate-y-0.5 active:translate-y-0.5`}
    >
      <CardFlag code={country.code} />
      <span className="text-base leading-tight font-black">
        <AutoFurigana text={country.name} />
      </span>
      {text && (
        <span aria-hidden className="flex w-full flex-col items-center gap-1">
          <span className="block h-2 w-full overflow-hidden rounded-full bg-[#efe5cf]">
            <span
              className="block h-full rounded-full bg-[#5bb33e]"
              style={{ width: `${achievementRatio(country.achievement) * 100}%` }}
            />
          </span>
          <span className="flex items-center gap-1 text-xs font-black text-[#6b5d45]">
            {isAllCleared(country.achievement) && <AssetImage asset={SPRU_STAGES.cleared} size={18} />}
            {text}
          </span>
        </span>
      )}
    </Link>
  );
}

/** まだの国のカード。鍵の印を付けた灰色の国旗と、国名だけ。押すと「せかいへ」の案内を出す */
export function LockedCountryCard({ country, onSelect }: { country: LearnCountry; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${country.name}(まだの国)`}
      className={`${CARD_CLASS} border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a]`}
    >
      {/* 鍵は国旗の左上の角に丸い印で重ねる(国名の前に並べると、幅320pxで長い国名が2行に折れる) */}
      <span className="relative block w-full max-w-28">
        <CardFlag code={country.code} locked />
        <span
          aria-hidden
          className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#dccfb4] bg-[#fffaf0]"
        >
          <Lock className="h-3.5 w-3.5" />
        </span>
      </span>
      <span className="text-base leading-tight font-black">
        <AutoFurigana text={country.name} />
      </span>
    </button>
  );
}
