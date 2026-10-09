"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";

import { ProfileAvatar } from "@/components/app/avatar-badge";
import { BadgeImage } from "@/components/app/badge-image";
import { useProfile } from "@/components/app/profile-provider";
import { WalletCards } from "@/components/app/wallet-cards";
import { apiFetch } from "@/lib/api";
import { levelRatio, levelText, type CountryLevel, type LanguageLevel } from "@/lib/course-levels";
import { ringFraction, xpToNextText } from "@/lib/level-ring";
import { topLevels } from "@/lib/status-sheet";
import { AutoFurigana } from "@/components/app/auto-furigana";

type Passport = { country_levels?: CountryLevel[]; language_levels?: LanguageLevel[] };

/**
 * ヘッダーのレベルの輪を押すと開く「じぶんの状態」(docs/design/2026-10-07-header-level-design.md 4章)。見るだけ。
 * レベルと次までのXP・学習ポイントとコインの数字・連続日数・国レベルと言語レベルの上位3つ・パスポートへのボタン。
 * 国レベル・言語レベルは、開いたときにパスポートのAPIから読み込む(新しいAPIは作らない)
 */
export function StatusSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile } = useProfile();
  const [passport, setPassport] = useState<Passport | null | undefined>(undefined);
  const close = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 開くたびに最新を読み直す(読み込み中の表示から始める)
    setPassport(undefined);
    apiFetch("/api/passport")
      .then(async (res) => {
        if (active) setPassport(res.ok ? await res.json() : null);
      })
      .catch(() => {
        if (active) setPassport(null);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const range = profile?.level_xp;
  const xpText = profile ? xpToNextText(profile.xp, range) : null;
  const countries = topLevels((passport?.country_levels ?? []).map((l) => ({ key: l.code, name: l.name, level: l.level, max: l.max })), 3);
  const languages = topLevels((passport?.language_levels ?? []).map((l) => ({ key: l.key, name: l.name, level: l.level, max: l.max })), 3);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[22px] bg-[#fffaf0] px-4 pt-3 pb-8 text-[#3b3226] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0d6c2]" />

          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} size={52} />
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-base font-black">{profile?.name ?? "じぶん"}</DialogPrimitive.Title>
              <p className="text-2xl leading-tight font-black text-[#2e6b1c]">Lv.{profile?.level ?? 1}</p>
            </div>
          </div>

          {profile && (
            <div className="mt-2">
              <div
                role="progressbar"
                aria-label="次のレベルまで"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ringFraction(profile.xp, range) * 100)}
                className="h-3 overflow-hidden rounded-full bg-[#efe5cf]"
              >
                <div className="h-full rounded-full bg-[#3b7f26] transition-[width]" style={{ width: `${ringFraction(profile.xp, range) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs font-bold text-[#6b5d45]">
                {xpText ? `${xpText} で Lv.${profile.level + 1}` : "次のレベルが近いよ"}
              </p>
            </div>
          )}

          <WalletCards points={profile?.points ?? 0} coins={profile?.coins ?? 0} className="mt-3" />

          {typeof profile?.current_streak === "number" && profile.current_streak > 0 && (
            <p className="mt-3 flex items-center gap-1 text-sm font-black text-[#c2402c]">
              <BadgeImage badge="streak" size={18} />
              連続プレイ {profile.current_streak}日
            </p>
          )}

          <LevelRows heading="国レベル" rows={countries} loading={passport === undefined} failed={passport === null} />
          <LevelRows heading="言語レベル" rows={languages} loading={passport === undefined} failed={passport === null} />

          <Link
            href="/passport"
            onClick={close}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-sm font-black text-white hover:bg-[#438b2d]"
          >
            <BadgeImage badge="passport" size={20} />
            <AutoFurigana text="パスポートを見る" />
          </Link>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LevelRows({
  heading,
  rows,
  loading,
  failed,
}: {
  heading: string;
  rows: { key: string; name: string; level: number; max: number }[];
  loading: boolean;
  failed: boolean;
}) {
  return (
    <section className="mt-4">
      <h3 className="mb-1 text-xs font-black text-[#6b5d45]">{heading}</h3>
      {loading ? (
        <p className="text-xs font-bold text-[#8a7a5a]"><AutoFurigana text="読み込み中..." /></p>
      ) : failed ? (
        <p className="text-xs font-bold text-[#8a7a5a]"><AutoFurigana text="読み込めなかったよ" /></p>
      ) : rows.length === 0 ? (
        <p className="text-xs font-bold text-[#8a7a5a]"><AutoFurigana text="まだないよ。ステージをクリアすると上がるよ" /></p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 text-sm font-black">
              <span className="w-24 shrink-0 truncate">{row.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#efe5cf]">
                <span className="block h-full rounded-full bg-[#f2b632]" style={{ width: `${levelRatio(row.level, row.max) * 100}%` }} />
              </span>
              <span className="shrink-0 text-xs text-[#6b5d45]">{levelText(row.level, row.max)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
