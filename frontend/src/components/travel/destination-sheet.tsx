"use client";

import { Plane, Ship, Ticket } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { GROUND_ART, type GroundArtKey } from "@/components/world/ground-art";
import { ItemIcon } from "@/components/world/item-art";

import { Flag } from "./flag";
import { roadChoice, roadName } from "./road";
import { ticketHintText, transportText } from "./travel";
import type { Destination } from "./types";

const STATE_TEXT: Record<Destination["state"], string> = { visited: "着いた国", unvisited: "まだの国" };

/** 島を押したときのカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-2) */
export function DestinationSheet({
  destination,
  ticketHint,
  busy,
  error,
  roadStyle,
  roadBusy,
  roadMessage,
  onSelectRoad,
  onDepart,
  onGo,
  onClose,
}: {
  destination: Destination;
  ticketHint: string | null;
  busy: boolean;
  error: string | null;
  /** 今の町の道(日本は 'jp')と、道を変えている通信中か、変えたあとの一言(設計書 2026-10-05-road-style 4-3) */
  roadStyle: string;
  roadBusy: boolean;
  roadMessage: string | null;
  onSelectRoad: (style: string) => void;
  onDepart: () => void;
  onGo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,40,60,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destination-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-center gap-2.5">
          <Flag src={destination.flag} size={36} />
          <h2 id="destination-sheet-title" className="text-lg font-black">
            {destination.name}
          </h2>
          <span className="rounded-full bg-[#efe5cf] px-2 py-0.5 text-[11px] font-black text-[#6b5d45]">
            <AutoFurigana text={STATE_TEXT[destination.state]} />
          </span>
        </div>

        {destination.state === "unvisited" && (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-[#f5efe1] px-3 py-2 text-sm font-black">
              {destination.transport === "plane" ? (
                <Plane aria-hidden className="h-4 w-4 text-[#2b6fa3]" />
              ) : (
                <Ship aria-hidden className="h-4 w-4 text-[#2b6fa3]" />
              )}
              <span>
                <AutoFurigana text={transportText(destination.transport)} />
              </span>
            </p>
            <ul className="grid grid-cols-2 gap-2" aria-label="おみやげ">
              {Array.from({ length: destination.souvenir_count }, (_, index) => (
                <li key={index} className="flex flex-col items-center gap-1 rounded-xl bg-[#f5efe1] p-2 text-center">
                  <span
                    aria-hidden
                    className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#e8dfcf] text-2xl font-black text-[#8a7a5a]"
                  >
                    ？
                  </span>
                  <span className="text-[11px] font-bold text-[#6b5d45]">
                    <AutoFurigana text="着いたらわかるよ" />
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onDepart}
              disabled={!destination.can_depart || busy}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#2b6fa3] text-base font-black text-white shadow-[0_4px_0_#1d4f76] disabled:bg-[#efe5cf] disabled:text-[#6b5d45] disabled:shadow-none"
            >
              <Ticket aria-hidden className="h-5 w-5" />
              <span>
                <AutoFurigana text={busy ? "出発中..." : "チケットを使って出発する"} />
              </span>
            </button>
            {!destination.can_depart && (
              <p className="text-center text-xs font-bold text-[#8a6a3a]">
                <AutoFurigana text={ticketHintText(ticketHint)} />
              </p>
            )}
          </>
        )}

        {destination.state === "visited" && (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {destination.souvenirs.map((souvenir) => (
                <li key={souvenir.key} className="flex flex-col items-center gap-1 rounded-xl bg-[#f5efe1] p-2 text-center">
                  <ItemIcon
                    assetKey={souvenir.asset_key}
                    size={52}
                    className={souvenir.met || souvenir.received ? "" : "opacity-40 grayscale"}
                  />
                  <span className="text-xs font-black">
                    <AutoFurigana text={souvenir.name} />
                  </span>
                  <span className="text-[11px] font-bold text-[#6b5d45]">
                    <AutoFurigana
                      text={souvenir.received ? "受け取りずみ" : souvenir.met ? "受け取れるよ！" : `${souvenir.condition_label}しよう`}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <RoadChoice
              destinationKey={destination.key}
              roadStyle={roadStyle}
              busy={roadBusy}
              message={roadMessage}
              onSelect={onSelectRoad}
            />
            <button
              type="button"
              onClick={onGo}
              className="h-[52px] rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
            >
              <AutoFurigana text="行く" />
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-[#c2402c]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** 着いた国の道を、町の道にする(絵がない国には出さない)。選んでいる国には印と、日本の道にもどすボタン */
function RoadChoice({
  destinationKey,
  roadStyle,
  busy,
  message,
  onSelect,
}: {
  destinationKey: string;
  roadStyle: string;
  busy: boolean;
  message: string | null;
  onSelect: (style: string) => void;
}) {
  const art = GROUND_ART[`road_${destinationKey}` as GroundArtKey];
  const choice = roadChoice(destinationKey, roadStyle, !!art);
  if (choice === "none" || !art) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[#f5efe1] p-3">
      <div className="flex items-center gap-3">
        <AssetImage asset={{ src: art.src, width: art.size, height: art.size }} size={48} className="rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-black">
            <AutoFurigana text={roadName(destinationKey)} />
          </span>
          {choice === "selected" && (
            <span className="text-[11px] font-black text-[#3b7f26]">
              <AutoFurigana text="いまの町の道" />
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect(choice === "selected" ? "jp" : destinationKey)}
          className="h-10 shrink-0 rounded-xl bg-[#efe5cf] px-3 text-sm font-black disabled:opacity-60"
        >
          <AutoFurigana text={choice === "selected" ? "日本の道にもどす" : "この国の道にする"} />
        </button>
      </div>
      {message && (
        <p role="status" className="text-center text-xs font-black text-[#3b7f26]">
          <AutoFurigana text={message} />
        </p>
      )}
    </div>
  );
}
