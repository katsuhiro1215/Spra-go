"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownMood, type SpruView, type TownEvent } from "@/components/spru/mood";
import { Ambience, TIME_THEME } from "@/components/world/ambience";
import { pickLine } from "@/components/world/companions";
import { Festive } from "@/components/world/festive";
import { liveliness, livelinessStars } from "@/components/world/liveliness";
import { getSeason, getTimeOfDay, isSpruSleepTime, type TimeOfDay } from "@/components/world/time-of-day";
import type { FamilyTown as FamilyTownData, WorldGarden } from "@/components/world/types";
import { WorldScene } from "@/components/world/world-scene";
import { apiFetch } from "@/lib/api";

import { GreetPanel } from "./greet-panel";
import { OutingScene } from "./outing-scene";

// 仲間をタップしたときの吹き出しを出しておく時間(町と同じ)
const COMPANION_TALK_MS = 3_000;
const NO_TILES = new Set<string>();
const noop = () => {};

type LoadState = { kind: "ready"; town: FamilyTownData } | { kind: "missing" };
type CompanionTalk = { key: string; at: number; line: string };

/** 家族の町(見るだけ。設計書5-5) */
export function FamilyTown({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { play } = useSound();
  const [state, setState] = useState<LoadState | undefined>(undefined);
  const [outing, setOuting] = useState<"depart" | "home" | null>("depart");
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);
  const [companionTalk, setCompanionTalk] = useState<CompanionTalk | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    apiFetch(`/api/family/${profileId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.status === 422) {
          // 自分の町なら自分の町へ、プロフィールを選んでいなければ選ぶ画面へ
          router.replace(data.message === "自分の町だよ" ? "/" : "/profiles");
          return;
        }
        if (!res.ok) {
          setState({ kind: "missing" });
          return;
        }
        const town: FamilyTownData = data;
        setState({ kind: "ready", town });
        setEvent({ kind: "say", at: Date.now(), image: "wave", line: `${town.profile.name}の町へ、ようこそ！` });
      })
      .catch(() => setState({ kind: "missing" }));
  }, [profileId, router]);

  // 町は1秒ごとに描き直すので、お出かけの場面のタイマーがやり直しにならないよう固定する
  const finishOuting = useCallback(() => {
    if (outing === "home") router.push("/");
    else setOuting(null);
  }, [outing, router]);

  const mood = pickTownMood({
    now,
    lastInteractionAt,
    event,
    nightWokenAt,
    placing: false,
    prompt: "ゆっくり見ていってね",
  });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  function handleSpruTap() {
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    setEvent({ kind: "say", at, image: "wave", line: "やっほー！来てくれてありがとう" });
  }

  function handleCompanionTap(key: string) {
    if (state?.kind !== "ready") return;
    const companion = state.town.companions.find((c) => c.key === key);
    if (!companion) return;
    setCompanionTalk({ key, at: Date.now(), line: pickLine(companion.lines, Math.random()) });
  }

  function handleGreeted() {
    if (state?.kind !== "ready") return;
    setState({ kind: "ready", town: { ...state.town, greeted_today: true } });
    play("correct");
    setEvent({ kind: "say", at: Date.now(), image: "jump", line: "あいさつしたよ！" });
  }

  const timeOfDay = getTimeOfDay(new Date(now));
  const quiet = isSpruSleepTime(new Date(now));

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={() => setLastInteractionAt(Date.now())}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        {state === undefined && <p className="mt-16 text-center text-sm">読み込み中...</p>}

        {state?.kind === "missing" && (
          <div className="mx-4 mt-16 flex flex-col items-center gap-3 rounded-2xl bg-[#fffaf0] p-5 text-center">
            <p className="text-sm font-bold">
              <AutoFurigana text="町が見つからなかったよ" />
            </p>
            <Link href="/family" className="rounded-full bg-[#3b7f26] px-4 py-2 text-sm font-black text-white">
              <AutoFurigana text="家族の町の一覧へ" />
            </Link>
          </div>
        )}

        {state?.kind === "ready" && (
          <ReadyTown
            town={state.town}
            mood={mood}
            timeOfDay={timeOfDay}
            now={now}
            quiet={quiet}
            talk={talk}
            onSpruTap={handleSpruTap}
            onCompanionTap={handleCompanionTap}
            onGreeted={handleGreeted}
            onHome={() => setOuting("home")}
          />
        )}
      </div>

      <BottomNav />

      {outing && <OutingScene kind={outing} onDone={finishOuting} />}
    </div>
  );
}

function ReadyTown({
  town,
  mood,
  timeOfDay,
  now,
  quiet,
  talk,
  onSpruTap,
  onCompanionTap,
  onGreeted,
  onHome,
}: {
  town: FamilyTownData;
  mood: SpruView;
  timeOfDay: TimeOfDay;
  now: number;
  quiet: boolean;
  talk: CompanionTalk | null;
  onSpruTap: () => void;
  onCompanionTap: (key: string) => void;
  onGreeted: () => void;
  onHome: () => void;
}) {
  const lively = liveliness(town.items, town.companions.length);
  // 見るだけなので、水やりなどの状態は持たない(畑の見た目だけ)
  const garden: WorldGarden = {
    ...town.garden,
    waterings: 0,
    learned_today: false,
    watered_today: false,
    can_sow: false,
    can_water: false,
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2 rounded-b-[22px] bg-[#fffaf0] px-3.5 py-3 shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
        <div className="min-w-0">
          <h1 className="text-lg font-black break-all text-[#2f4a22]">
            <AutoFurigana text={`${town.profile.name}の町`} />
          </h1>
          <p className="text-xs font-bold text-[#6b5d45]">
            Lv.{town.profile.level} ・ <AutoFurigana text="にぎやか度" />{" "}
            <span className="text-[#e0a100]">{livelinessStars(lively.level)}</span> <AutoFurigana text={lively.label} />
          </p>
        </div>
        <button type="button" onClick={onHome} className="shrink-0 rounded-full bg-[#3b7f26] px-3 py-2 text-sm font-black text-white">
          <AutoFurigana text="自分の町にもどる" />
        </button>
      </header>

      <div className="relative mt-3 px-1">
        <WorldScene
          readOnly
          land={town.land}
          items={town.items}
          validTiles={NO_TILES}
          placing={false}
          onTileTap={noop}
          onItemTap={noop}
          spru={mood}
          bloom={bloomOf(town.spru.growth)}
          onSpruTap={onSpruTap}
          timeOfDay={timeOfDay}
          poppedItemId={null}
          garden={garden}
          onGardenTap={noop}
          companions={town.companions}
          onCompanionTap={onCompanionTap}
          companionTalk={talk}
          reviewGiver={null}
          quiet={quiet}
        />
        <Festive level={lively.level} timeOfDay={timeOfDay} quiet={quiet} />
        <Ambience timeOfDay={timeOfDay} season={getSeason(new Date(now))} />
      </div>

      <GreetPanel profileId={town.profile.id} greeted={town.greeted_today} onGreeted={onGreeted} />
    </>
  );
}
