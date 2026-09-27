"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownHint } from "@/components/spru/hint";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { apiFetch } from "@/lib/api";

import { Ambience, TIME_THEME } from "./ambience";
import { BornOverlay } from "./born-overlay";
import { gardenPrompt, pickGardenTap } from "./garden";
import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { PlacementBar } from "./placement-bar";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import type { BornResult, ShopListItem, WorldData, WorldGarden, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const TAP_IMAGES = ["shy", "laugh", "cheer"] as const;
// 仲間をタップしたときの吹き出しを出しておく時間
const COMPANION_TALK_MS = 3_000;
// 3回目の水やりで生まれたとき、水やりの動きを見せてからお祝いを出す
const BORN_DELAY_MS = 1_600;

export function WorldScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 最初に開いたときの ?place= だけを使う(配置後に読み直しても配置モードに戻らないようにURLからは消す)
  const initialPlaceParam = useRef(searchParams.get("place"));
  const { play } = useSound();
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [poppedItemId, setPoppedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { profile: sharedProfile, applyPartial, refresh: refreshProfile } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  // スプルの出し分け(components/spru/mood.ts)に渡す状態。時刻は1秒ごとに進める
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);
  const [companionTalk, setCompanionTalk] = useState<{ key: string; at: number } | null>(null);
  const [born, setBorn] = useState<BornResult | null>(null);
  // 種まき・水やりの通信中は、続けて押しても送らない
  const [gardenBusy, setGardenBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // プロフィール選択直後はここに来るため、アプリ起動時(未選択)のままの共有プロフィールを取り直す
    refreshProfile();
    apiFetch("/api/world").then(async (res) => {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 422) {
        router.replace("/profiles");
        return;
      }
      if (res.ok) {
        const data: WorldData = await res.json();
        setWorld(data);
        applyPartial({ points: data.profile.points });
        setEvent({ kind: "greet", at: Date.now() });

        // ショップやバッグから /?place=ID で来たら、そのアイテムの配置モードにする。
        // 自分のアイテムでないIDや存在しないIDは無視して普通に表示する
        const placeParam = initialPlaceParam.current;
        if (placeParam) {
          initialPlaceParam.current = null;
          const id = Number(placeParam);
          if ([...data.items, ...data.bag].some((item) => item.id === id)) setPlacingId(id);
          router.replace("/");
        }
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial, refreshProfile]);

  const placingItem = useMemo(
    () => (world && placingId !== null ? [...world.items, ...world.bag].find((item) => item.id === placingId) ?? null : null),
    [world, placingId],
  );

  const validTiles = useMemo(() => {
    const tiles = new Set<string>();
    if (!world || placingId === null) return tiles;
    const blocked = new Set(world.land.blocked.map(([x, y]) => tileKey(x, y)));
    const occupied = new Set(
      world.items.filter((item) => item.id !== placingId).map((item) => tileKey(item.x as number, item.y as number)),
    );
    for (let y = 0; y < world.land.size; y++) {
      for (let x = 0; x < world.land.size; x++) {
        const key = tileKey(x, y);
        if (!blocked.has(key) && !occupied.has(key)) tiles.add(key);
      }
    }
    return tiles;
  }, [world, placingId]);

  const placing = placingItem !== null;
  const growth = world?.spru.growth ?? 0;
  const prompt = world && !placing ? gardenPrompt(world.garden) : null;
  const mood = pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing, prompt });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  async function sow() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/sow", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { spru: { growth: number }; garden: WorldGarden } = data;
      setWorld((prev) => (prev ? { ...prev, spru: next.spru, garden: next.garden } : prev));
      setMessage(null);
      play("correct");
      setEvent({ kind: "sow", at: Date.now() });
    } finally {
      setGardenBusy(false);
    }
  }

  async function water() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/water", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { garden: WorldGarden; born: BornResult | null } = data;
      setWorld((prev) => (prev ? { ...prev, garden: next.garden } : prev));
      setMessage(null);
      setEvent({ kind: "water", at: Date.now() });
      const result = next.born;
      if (result) {
        setTimeout(() => {
          play("allCorrect");
          setBorn(result);
        }, BORN_DELAY_MS);
      }
    } finally {
      setGardenBusy(false);
    }
  }

  // スプル以外をさわったとき。昼に座って・寝ていたら起きる(夜の眠りはスプルをタップしたときだけ起きる)
  function handleInteraction(e: { target: EventTarget }) {
    if (e.target instanceof Element && e.target.closest("[data-spru]")) return;
    const at = Date.now();
    if (mood.sleeping && !isSpruSleepTime(new Date(at))) setEvent({ kind: "woke", at });
    setLastInteractionAt(at);
  }

  function handleSpruTap() {
    if (!world) return;
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    if (world.garden.can_sow) {
      sow();
      return;
    }
    setEvent({
      kind: "tap",
      at,
      image: TAP_IMAGES[Math.floor(Math.random() * TAP_IMAGES.length)],
      hint: pickTownHint({
        bag: world.bag,
        points: world.profile.points,
        level: world.profile.level,
        shop,
        canWater: world.garden.can_water,
      }),
    });
  }

  function handleGardenTap() {
    if (!world || gardenBusy) return;
    const tap = pickGardenTap(world.garden);
    if (tap.action === "sow") sow();
    else if (tap.action === "water") water();
    else setEvent({ kind: "say", at: Date.now(), image: tap.image, line: tap.line });
  }

  function handleCompanionTap(key: string) {
    setCompanionTalk({ key, at: Date.now() });
  }

  function handleBornClose() {
    if (!born) return;
    const result = born;
    setBorn(null);
    if (result.kind === "item") {
      setWorld((prev) => (prev ? { ...prev, bag: [...prev.bag, result.world_item] } : prev));
      return;
    }
    setWorld((prev) => (prev ? { ...prev, companions: [...prev.companions, result] } : prev));
    setCompanionTalk({ key: result.key, at: Date.now() });
  }

  // 画面を先に更新し、APIが失敗したら元に戻す
  async function moveItem(item: WorldItem, x: number | null, y: number | null): Promise<boolean> {
    if (!world) return false;
    const previous = world;
    const updated = { ...item, x, y };
    const others = (list: WorldItem[]) => list.filter((i) => i.id !== item.id);
    setWorld({
      ...world,
      items: x === null ? others(world.items) : [...others(world.items), updated],
      bag: x === null ? [...others(world.bag), updated] : others(world.bag),
    });

    const res = await apiFetch(`/api/world/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ x, y }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setWorld(previous);
      setMessage(data.message ?? "通信エラーが発生しました。");
      setEvent({ kind: "error", at: Date.now() });
      return false;
    }
    return true;
  }

  async function placeAt(x: number, y: number) {
    if (!placingItem) return;
    const item = placingItem;
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent({ kind: "placed", at: Date.now(), itemName: item.name });
    }
  }

  async function putAway(item: WorldItem) {
    setSelected(null);
    setMessage(null);
    if (await moveItem(item, null, null)) {
      setEvent({ kind: "stored", at: Date.now(), itemName: item.name });
    }
  }

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      setEvent({ kind: "welcome", at: Date.now() });
    } finally {
      setWelcomeBusy(false);
    }
  }

  const timeOfDay = getTimeOfDay(new Date(now));
  const season = getSeason(new Date(now));

  if (!world) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込み中...
      </div>
    );
  }

  const nextLocked = shop
    .filter((item) => item.type === "decoration" && item.min_level > world.profile.level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  const nextUnlock = nextLocked ? `Lv.${nextLocked.min_level}で ${nextLocked.name}` : null;
  const continueHref = world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn";

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={handleInteraction}
      onKeyDown={handleInteraction}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} growth={growth} nextUnlock={nextUnlock} />

        {placingItem && <PlacementBar item={placingItem} onCancel={() => setPlacingId(null)} />}

        {message && (
          <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {message}
          </p>
        )}

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="relative mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={validTiles}
            placing={placing}
            onTileTap={placeAt}
            onItemTap={setSelected}
            spru={mood}
            bloom={bloomOf(growth)}
            onSpruTap={handleSpruTap}
            timeOfDay={timeOfDay}
            poppedItemId={poppedItemId}
            garden={world.garden}
            onGardenTap={handleGardenTap}
            companions={world.companions}
            onCompanionTap={handleCompanionTap}
            companionTalk={talk}
            quiet={isSpruSleepTime(new Date(now))}
          />
          <Ambience timeOfDay={timeOfDay} season={season} />
        </div>

        {!placingItem && (
          <Link
            href={continueHref}
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <BookOpen className="h-5 w-5" aria-hidden />
            つづきから学ぶ
          </Link>
        )}
      </div>

      <BottomNav />

      {selected && (
        <ItemActionSheet
          item={selected}
          onMove={() => {
            setPlacingId(selected.id);
            setSelected(null);
          }}
          onPutAway={() => putAway(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}

      {born && <BornOverlay born={born} onClose={handleBornClose} />}
    </div>
  );
}
