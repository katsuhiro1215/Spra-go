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
import { CompanionSheet } from "./companion-sheet";
import { pickLine, pickSpruTap, reviewGiverKey } from "./companions";
import { ErrandReturn } from "./errand-return";
import { ErrandSheet } from "./errand-sheet";
import { errandGo, townPrompt } from "./errands";
import { pickGardenTap } from "./garden";
import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { liveliness } from "./liveliness";
import { LivelinessCard } from "./liveliness-card";
import { NicknameDialog } from "./nickname-dialog";
import { PlacementBar } from "./placement-bar";
import { ReviewCard } from "./review-card";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import { TownButtons } from "./town-buttons";
import type {
  BornResult,
  ErrandClaimResult,
  ShopListItem,
  WorldCompanion,
  WorldData,
  WorldErrand,
  WorldGarden,
  WorldItem,
  WorldReview,
} from "./types";
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
  const [companionTalk, setCompanionTalk] = useState<{ key: string; at: number; line: string } | null>(null);
  const [born, setBorn] = useState<BornResult | null>(null);
  // 種まき・水やりの通信中は、続けて押しても送らない
  const [gardenBusy, setGardenBusy] = useState(false);
  // 開いている仲間のカード(仲間のキー)・スプルの復習カード・最初の仲間の名前付け
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [reviewCardOpen, setReviewCardOpen] = useState(false);
  const [naming, setNaming] = useState<WorldCompanion | null>(null);
  // 相棒の変更の通信中は、続けて押しても送らない
  const [partnerBusy, setPartnerBusy] = useState(false);
  // おつかいのカード・受け取りの通信中の番号・受け取りの場面、にぎやか度のカード
  const [errandsOpen, setErrandsOpen] = useState(false);
  const [claimingSlot, setClaimingSlot] = useState<number | null>(null);
  const [errandReturn, setErrandReturn] = useState<{ errand: WorldErrand; result: ErrandClaimResult } | null>(null);
  const [livelinessOpen, setLivelinessOpen] = useState(false);

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
  const prompt = world && !placing ? townPrompt({ errands: world.errands, garden: world.garden, review: world.review }) : null;
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

  // 相棒・名前が変わると、並び・立ち位置・復習を出す人も変わる
  function applyCompanions(data: { companions: WorldCompanion[]; review: WorldReview }) {
    setWorld((prev) => (prev ? { ...prev, companions: data.companions, review: data.review } : prev));
  }

  // 仲間が生まれた後は、相棒・立ち位置・復習を出す人が変わるため読み直す
  async function reloadCompanions() {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return;
    const data: WorldData = await res.json();
    applyCompanions(data);
  }

  async function renameCompanion(key: string, nickname: string | null): Promise<string | null> {
    const res = await apiFetch(`/api/world/companions/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) return data.errors?.nickname?.[0] ?? data.message ?? "通信エラーが発生しました。";
    applyCompanions(data);
    return null;
  }

  async function makePartner(key: string) {
    if (partnerBusy) return;
    setPartnerBusy(true);
    try {
      const res = await apiFetch("/api/world/partner", { method: "POST", body: JSON.stringify({ key }) }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      applyCompanions(data);
      setMessage(null);
      play("correct");
      const partner = (data.companions as WorldCompanion[]).find((c) => c.key === key);
      if (partner) setCompanionTalk({ key, at: Date.now(), line: pickLine(partner.lines, Math.random()) });
    } finally {
      setPartnerBusy(false);
    }
  }

  // 日付が変わった後の受け取りなど、おつかいだけを読み直す
  async function reloadErrands() {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return;
    const data: WorldData = await res.json();
    setWorld((prev) => (prev ? { ...prev, errands: data.errands } : prev));
  }

  async function claimErrand(errand: WorldErrand) {
    if (claimingSlot !== null) return;
    setClaimingSlot(errand.slot);
    try {
      const res = await apiFetch(`/api/errands/${errand.slot}/claim`, { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setErrandsOpen(false);
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        reloadErrands();
        return;
      }
      const result: ErrandClaimResult = data;
      setWorld((prev) => (prev ? { ...prev, errands: result.errands, profile: { ...prev.profile, points: result.points } } : prev));
      applyPartial({ points: result.points });
      setMessage(null);
      setErrandsOpen(false);
      play("correct");
      setErrandReturn({ errand, result });
      // 相棒のなかよし度が変わると、仲間のカードのハートも変わる
      if (result.partner) reloadCompanions();
    } finally {
      setClaimingSlot(null);
    }
  }

  function goErrand(errand: WorldErrand) {
    if (!world) return;
    const go = errandGo(errand, {
      continueHref: world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn",
      learnedToday: world.garden.learned_today,
      bagCount: world.bag.length,
    });
    if (go.kind === "link") {
      router.push(go.href);
      return;
    }
    setErrandsOpen(false);
    setEvent({ kind: "say", at: Date.now(), image: "think", line: go.line });
  }

  function startReview() {
    router.push("/review");
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
    const tap = pickSpruTap({ canSow: world.garden.can_sow, review: world.review });
    if (tap === "sow") {
      sow();
      return;
    }
    if (tap === "review") {
      setReviewCardOpen(true);
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
    const companion = world?.companions.find((c) => c.key === key);
    if (!companion) return;
    setCompanionTalk({ key, at: Date.now(), line: pickLine(companion.lines, Math.random()) });
    setSheetKey(key);
  }

  function handleBornClose() {
    if (!born) return;
    const result = born;
    setBorn(null);
    if (result.kind === "item") {
      setWorld((prev) => (prev ? { ...prev, bag: [...prev.bag, result.world_item] } : prev));
      return;
    }
    reloadCompanions();
    setCompanionTalk({ key: result.key, at: Date.now(), line: result.lines[0] ?? "" });
    if (result.is_partner) setNaming(result);
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
  const sheetCompanion = sheetKey ? (world.companions.find((c) => c.key === sheetKey) ?? null) : null;
  const lively = liveliness(world.items, world.companions.length);

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

        {!placingItem && (
          <TownButtons
            errands={world.errands}
            lively={lively}
            familyCount={world.family_count}
            onErrands={() => setErrandsOpen(true)}
            onLiveliness={() => setLivelinessOpen(true)}
          />
        )}

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
            reviewGiver={placing ? null : reviewGiverKey(world.review)}
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

      {sheetCompanion && (
        <CompanionSheet
          companion={sheetCompanion}
          reviewCount={world.review.available && world.review.giver.key === sheetCompanion.key ? world.review.count : null}
          busy={partnerBusy}
          onStartReview={startReview}
          onMakePartner={() => makePartner(sheetCompanion.key)}
          onRename={(nickname) => renameCompanion(sheetCompanion.key, nickname)}
          onClose={() => setSheetKey(null)}
        />
      )}

      {reviewCardOpen && world.review.available && (
        <ReviewCard count={world.review.count} onStart={startReview} onClose={() => setReviewCardOpen(false)} />
      )}

      {errandsOpen && (
        <ErrandSheet
          errands={world.errands}
          busy={claimingSlot !== null}
          onClaim={claimErrand}
          onGo={goErrand}
          onClose={() => setErrandsOpen(false)}
        />
      )}

      {errandReturn && (
        <ErrandReturn errand={errandReturn.errand} result={errandReturn.result} onClose={() => setErrandReturn(null)} />
      )}

      {livelinessOpen && <LivelinessCard lively={lively} onClose={() => setLivelinessOpen(false)} />}

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}

      {born && <BornOverlay born={born} onClose={handleBornClose} />}

      {naming && (
        <NicknameDialog
          companion={naming}
          onSubmit={async (nickname) => {
            const error = await renameCompanion(naming.key, nickname);
            if (error === null) setNaming(null);
            return error;
          }}
          onSkip={() => setNaming(null)}
        />
      )}
    </div>
  );
}
