"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";
import { plantImage } from "@/components/spru/plant";

import { heartsText } from "./companions";
import { progressPercent, remainingText, statusNote, townAction, townCountText } from "./roster";
import type { RosterData, RosterMember, WorldCompanion } from "./types";

/**
 * なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 5-5)。生まれた子の名前・ハート・町にいるかは
 * 町の仲間(companions)の今の値を使う(相棒や名前をこの画面の上で変えても合うように)
 */
export function RosterSheet({
  roster,
  companions,
  busy,
  onToggleTown,
  onOpen,
  onClose,
}: {
  roster: RosterData;
  companions: WorldCompanion[];
  busy: boolean;
  onToggleTown: (key: string, inTown: boolean) => void;
  onOpen: (key: string) => void;
  onClose: () => void;
}) {
  const townCount = companions.filter((c) => c.in_town).length;
  const sections: [string, RosterMember[]][] = [
    ["仲間", roster.members.filter((m) => !m.rare)],
    ["レアスプル", roster.members.filter((m) => m.rare)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-title"
        className="relative flex max-h-[90vh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="roster-title" className="text-lg font-black text-[#2e6b1c]">
            <AutoFurigana text="なかま" />
          </h2>
          <p className="text-xs font-black text-[#6b5d45]">
            <AutoFurigana text={townCountText(townCount, roster.town_limit)} />
          </p>
        </div>
        {sections.map(([title, members]) => (
          <section key={title} className="flex flex-col gap-2">
            <h3 className="text-sm font-black text-[#6b5d45]">
              <AutoFurigana text={title} />
            </h3>
            <ul className="grid grid-cols-3 gap-2">
              {members.map((member) => {
                const companion = companions.find((c) => c.key === member.key) ?? null;
                return (
                  <li key={member.key}>
                    {companion ? (
                      <BornCard
                        companion={companion}
                        action={townAction(companion, townCount, roster.town_limit)}
                        busy={busy}
                        onToggleTown={onToggleTown}
                        onOpen={onOpen}
                      />
                    ) : (
                      <WaitingCard member={member} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}

const CARD = "flex h-full flex-col items-center gap-1 rounded-2xl bg-[#f5efe1] px-1.5 pt-2 pb-2 text-center";

function BornCard({
  companion,
  action,
  busy,
  onToggleTown,
  onOpen,
}: {
  companion: WorldCompanion;
  action: ReturnType<typeof townAction>;
  busy: boolean;
  onToggleTown: (key: string, inTown: boolean) => void;
  onOpen: (key: string) => void;
}) {
  return (
    <div className={CARD}>
      <button type="button" onClick={() => onOpen(companion.key)} className="flex w-full flex-col items-center gap-0.5">
        <span className="flex h-[72px] items-end">
          <CompanionImage companionKey={companion.key} standHeight={96} />
        </span>
        <span className="w-full truncate text-xs font-black">{companion.name}</span>
        <span className="text-[11px] font-black text-[#d0467a]" aria-label={`ハート${companion.hearts}つ`}>
          {heartsText(companion.hearts)}
        </span>
      </button>
      <span
        className={`rounded-full px-2 text-[10px] font-black ${companion.in_town ? "bg-[#3b7f26] text-white" : "bg-[#e3d8c0] text-[#6b5d45]"}`}
      >
        <AutoFurigana text={companion.is_partner ? "相棒" : companion.in_town ? "町にいる" : "おうち"} />
      </span>
      {action && (
        <button
          type="button"
          disabled={busy || action.disabled}
          onClick={() => onToggleTown(companion.key, action.inTown)}
          className="mt-auto h-8 w-full rounded-xl bg-[#efe5cf] text-[11px] font-black disabled:opacity-50"
        >
          <AutoFurigana text={action.label} />
        </button>
      )}
    </div>
  );
}

function WaitingCard({ member }: { member: RosterMember }) {
  const note = statusNote(member);
  const seed =
    member.status === "in_bag"
      ? plantImage(member.key, "seed")
      : member.status === "growing"
        ? plantImage(member.key, "sprout")
        : null;
  return (
    <div className={CARD}>
      <span className="flex h-[72px] items-end">
        {seed ? (
          <Image src={seed.src} alt="" width={Math.round((seed.width * 48) / seed.height)} height={48} aria-hidden />
        ) : (
          <CompanionImage companionKey={member.key} standHeight={96} className="opacity-35 brightness-0" />
        )}
      </span>
      <span className="w-full truncate text-xs font-black">{member.name}</span>
      {note && (
        <span className="text-[10px] font-bold text-[#6b5d45]">
          <AutoFurigana text={note} />
        </span>
      )}
      {member.condition && member.status === "waiting" && (
        <>
          <span className="text-[10px] leading-tight font-bold text-[#6b5d45]">
            <AutoFurigana text={member.condition.text} />
          </span>
          <span className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-[#e3d8c0]" aria-hidden>
            <span className="block h-full rounded-full bg-[#f2b632]" style={{ width: `${progressPercent(member.condition)}%` }} />
          </span>
          <span className="text-[10px] font-black text-[#8a6a1c]">
            <AutoFurigana text={remainingText(member.condition)} />
          </span>
        </>
      )}
    </div>
  );
}
