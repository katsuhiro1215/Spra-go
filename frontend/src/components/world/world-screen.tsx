"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AssetImage } from "@/components/app/asset-image";
import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { LoadingScreen } from "@/components/app/spru-loading";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownHint } from "@/components/spru/hint";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { SPRU_ICONS } from "@/components/spru/spru-assets";
import { apiFetch } from "@/lib/api";
import { prefersReducedMotion } from "@/lib/motion";

import { Ambience, TIME_THEME } from "./ambience";
import { BornOverlay } from "./born-overlay";
import { CompanionSheet } from "./companion-sheet";
import { pickLine, pickSpruTap, reviewGiverKey } from "./companions";
import { ErrandReturn } from "./errand-return";
import { ErrandSheet } from "./errand-sheet";
import { errandGo, townPrompt } from "./errands";
import { Festive } from "./festive";
import { canSowSpruSeed, pickGardenTap, seedLabel } from "./garden";
import { GreetingsCard } from "./greetings-card";
import { ItemActionSheet } from "./item-action-sheet";
import { cloudLine, hasAnchorsOutside, openedLine, unlockFocus, validAnchors } from "./land";
import { liveliness, livelinessUpLine } from "./liveliness";
import { LivelinessCard } from "./liveliness-card";
import { homePlot } from "./map-view";
import { NicknameDialog } from "./nickname-dialog";
import { PlacementBar } from "./placement-bar";
import { PlotUnlockCard } from "./plot-unlock-card";
import { ReviewCard } from "./review-card";
import { SeedGift } from "./seed-gift";
import { SeedPicker } from "./seed-picker";
import {
  readSeasonShown,
  seasonGreeting,
  shouldShowSeasonGreeting,
  writeSeasonShown,
  type SeasonGreeting,
} from "./season-greeting";
import { SeasonGreetingCard } from "./season-greeting-card";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import { TownButtons } from "./town-buttons";
import { TownMap } from "./town-map";
import type {
  BornResult,
  ErrandClaimResult,
  NewSeed,
  ShopListItem,
  WorldCompanion,
  WorldData,
  WorldErrand,
  WorldGarden,
  WorldGreeting,
  WorldItem,
  WorldPlot,
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
// 区画のお祝い: 地図を区画へ動かす時間と、雲が散る時間(設計書5-2)
const FOCUS_MS = 600;
const CLEAR_MS = 1_200;

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
  // どの種をまく？(ふくろに種があるとき)
  const [pickerOpen, setPickerOpen] = useState(false);
  // 新しくもらった特別な種(ほかのお祝いの後に出す。docs/design/2026-09-29-rare-spru-design.md 5-2)
  const [seedGifts, setSeedGifts] = useState<NewSeed[]>([]);
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
  // 家族から届いたあいさつ(閉じるまで出す)と、今日まだ出していない季節のあいさつ
  const [greetings, setGreetings] = useState<WorldGreeting[]>([]);
  const [season, setSeason] = useState<SeasonGreeting | null>(null);
  // 区画のお祝いで地図を動かす先と、散らしている雲(お祝いの途中は null でない)
  const [focus, setFocus] = useState<{ plot: WorldPlot; at: number } | null>(null);
  const [clearing, setClearing] = useState<{ keys: string[]; fading: boolean } | null>(null);
  // 2×2の建物の下見(奥のマス)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const profileId = world?.profile.id ?? null;
  // 町は1秒ごとに描き直すので、季節のカードのタイマーがやり直しにならないよう固定する
  const closeSeason = useCallback(() => {
    if (profileId !== null) writeSeasonShown(profileId, new Date());
    setSeason(null);
  }, [profileId]);

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
        setGreetings(data.greetings);
        setSeedGifts(data.new_seeds);
        const opened = new Date();
        if (shouldShowSeasonGreeting(opened, readSeasonShown(data.profile.id))) setSeason(seasonGreeting(opened));
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

  const validTiles = useMemo(
    () => (world && placingItem ? validAnchors(world.land, world.items, placingItem.footprint, placingItem.id) : new Set<string>()),
    [world, placingItem],
  );

  const placing = placingItem !== null;
  const growth = world?.spru.growth ?? 0;
  const prompt = world && !placing ? townPrompt({ errands: world.errands, garden: world.garden, review: world.review }) : null;
  const mood = pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing, prompt });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  // seed は spru(スプルの種)か、ふくろの特別な種の色(docs/design/2026-09-29-rare-spru-design.md 3-3)
  async function sow(seed: string = "spru") {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/sow", { method: "POST", body: JSON.stringify({ seed }) }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      setPickerOpen(false);
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { spru: { growth: number }; garden: WorldGarden } = data;
      const planted = world?.garden.seed_bag.find((item) => item.key === seed);
      setWorld((prev) => (prev ? { ...prev, spru: next.spru, garden: next.garden } : prev));
      setMessage(null);
      play("correct");
      // スプルの種はスプルが頭を振って種が飛ぶ。特別な種は畑に植わるだけ(設計書5-3)
      if (planted) {
        setEvent({ kind: "say", at: Date.now(), image: "happy", line: `${seedLabel(planted.name)}をまいたよ！毎日水をあげて育てよう` });
      } else {
        setEvent({ kind: "sow", at: Date.now() });
      }
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
  async function reloadCompanions(): Promise<WorldData | null> {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return null;
    const data: WorldData = await res.json();
    applyCompanions(data);
    return data;
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

  // 閉じたら、出したあいさつだけに見た印を付ける。その間に届いたものは続けて出す
  async function closeGreetings() {
    const ids = greetings.map((greeting) => greeting.id);
    setGreetings([]);
    const res = await apiFetch("/api/world/greetings/seen", { method: "POST", body: JSON.stringify({ ids }) }).catch(() => null);
    if (!res || !res.ok) return;
    const data: { greetings: WorldGreeting[] } = await res.json();
    if (data.greetings.length > 0) setGreetings(data.greetings);
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
    const tap = pickSpruTap({ canSow: canSowSpruSeed(world.garden), review: world.review });
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
        tickets: world.tickets,
      }),
    });
  }

  function handleGardenTap() {
    if (!world || gardenBusy) return;
    const tap = pickGardenTap(world.garden);
    if (tap.action === "sow") sow();
    else if (tap.action === "choose") setPickerOpen(true);
    else if (tap.action === "water") water();
    else setEvent({ kind: "say", at: Date.now(), image: tap.image, line: tap.line });
  }

  function handleCompanionTap(key: string) {
    const companion = world?.companions.find((c) => c.key === key);
    if (!companion) return;
    setCompanionTalk({ key, at: Date.now(), line: pickLine(companion.lines, Math.random()) });
    setSheetKey(key);
  }

  function handleCloudTap(plot: WorldPlot) {
    setEvent({ kind: "say", at: Date.now(), image: "think", line: cloudLine(plot) });
  }

  function handleBornClose() {
    if (!born) return;
    const result = born;
    setBorn(null);
    if (result.kind === "item") {
      setWorld((prev) => (prev ? { ...prev, bag: [...prev.bag, result.world_item] } : prev));
      return;
    }
    // 生まれて段階が上がったらお祝いする
    const before = liveliness(world?.items ?? [], world?.companions.length ?? 0).level;
    reloadCompanions().then((data) => {
      if (!data) return;
      const after = liveliness(data.items, data.companions.length);
      if (after.level > before) setEvent({ kind: "say", at: Date.now(), image: "jump", line: livelinessUpLine(after.label) });
    });
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

  // 置いて段階が上がったときだけ、いつものひとことの代わりにお祝い(動かしただけでは数が変わらないので出ない)
  async function placeAt(x: number, y: number) {
    if (!placingItem || !world) return;
    const item = placingItem;
    const before = liveliness(world.items, world.companions.length).level;
    const after = liveliness([...world.items.filter((i) => i.id !== item.id), { ...item, x, y }], world.companions.length);
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent(
        after.level > before
          ? { kind: "say", at: Date.now(), image: "jump", line: livelinessUpLine(after.label) }
          : { kind: "placed", at: Date.now(), itemName: item.name },
      );
    }
  }

  // 2×2の建物は、光るマスを押すと下見になり、［ここに建てる］で決まる(設計書3-4・5-3)
  function handleTileTap(x: number, y: number) {
    if (!placingItem) return;
    if (placingItem.footprint > 1) {
      setPreview({ x, y });
      return;
    }
    placeAt(x, y);
  }

  function confirmBuild() {
    if (!preview) return;
    const { x, y } = preview;
    setPreview(null);
    placeAt(x, y);
  }

  function cancelPlacing() {
    setPlacingId(null);
    setPreview(null);
  }

  // ［見に行く］: カードを閉じ、地図を区画へ動かしてから雲を散らし、終わったら祝った印を送る(設計書3-2・5-2)
  function viewNewPlots() {
    if (!world) return;
    const plots = world.land.plots.filter((plot) => world.plots_new.includes(plot.key));
    if (plots.length === 0) return;
    const keys = plots.map((plot) => plot.key);
    const target = unlockFocus(plots);
    const reduced = prefersReducedMotion();
    setWorld((prev) => (prev ? { ...prev, plots_new: [] } : prev));
    setFocus({ plot: target, at: Date.now() });
    setClearing(reduced ? null : { keys, fading: false });
    const finish = () => {
      setClearing(null);
      play("correct");
      setEvent({ kind: "say", at: Date.now(), image: "cheer", line: openedLine(target) });
      // 失敗しても、次に町を開いたときにもう一度祝うだけ
      apiFetch("/api/world/plots/seen", { method: "POST", body: JSON.stringify({ keys }) }).catch(() => null);
    };
    if (reduced) {
      finish();
      return;
    }
    setTimeout(() => setClearing({ keys, fading: true }), FOCUS_MS);
    setTimeout(finish, FOCUS_MS + CLEAR_MS);
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
  const townSeason = getSeason(new Date(now));

  if (!world) {
    return (
      <LoadingScreen />
    );
  }

  const nextLocked = shop
    .filter((item) => item.type === "decoration" && item.min_level > world.profile.level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  const nextUnlock = nextLocked ? `Lv.${nextLocked.min_level}で ${nextLocked.name}` : null;
  const continueHref = world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn";
  const sheetCompanion = sheetKey ? (world.companions.find((c) => c.key === sheetKey) ?? null) : null;
  const lively = liveliness(world.items, world.companions.length);
  const newPlots = world.land.plots.filter((plot) => world.plots_new.includes(plot.key));
  // 開いたばかりの区画は、お祝いが終わるまで雲で隠しておく
  const veil = world.plots_new.length > 0 ? { keys: world.plots_new, fading: false } : clearing;
  // 区画のお祝い(雲の演出を含む)が終わるまで、家族・季節のあいさつは出さない
  const calm = !world.welcome_available && world.plots_new.length === 0 && clearing === null;

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={handleInteraction}
      onKeyDown={handleInteraction}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} growth={growth} nextUnlock={nextUnlock} />

        {placingItem && (
          <PlacementBar
            item={placingItem}
            previewing={preview !== null}
            hint={hasAnchorsOutside(validTiles, homePlot(world.land)) ? "地図を動かすと、ほかの場所も見られるよ" : null}
            onConfirm={confirmBuild}
            onCancel={cancelPlacing}
          />
        )}

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
          <TownMap land={world.land} focus={focus}>
            <WorldScene
              land={world.land}
              items={world.items}
              validTiles={validTiles}
              placing={placing}
              onTileTap={handleTileTap}
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
              onCloudTap={handleCloudTap}
              veil={veil}
              preview={preview && placingItem ? { ...preview, item: placingItem } : null}
            />
          </TownMap>
          {/* 空の飾りは地図と一緒に動かさず、見えている枠の上に重ねる(設計書3-3) */}
          <Festive level={lively.level} timeOfDay={timeOfDay} quiet={isSpruSleepTime(new Date(now))} />
          <Ambience timeOfDay={timeOfDay} season={townSeason} />
        </div>

        {!placingItem && (
          <Link
            href={continueHref}
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] pr-6 pl-3 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <AssetImage asset={SPRU_ICONS.continue} size={36} />
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
            setPreview(null);
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

      {pickerOpen && (
        <SeedPicker garden={world.garden} busy={gardenBusy} onPick={(seed) => sow(seed)} onClose={() => setPickerOpen(false)} />
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

      {/* はじめてのプレゼント → 区画のお祝い → 家族のあいさつ → 季節のあいさつ の順に1つずつ出す(雲の演出の間は次を待つ) */}
      {!world.welcome_available && newPlots.length > 0 && <PlotUnlockCard plots={newPlots} onView={viewNewPlots} />}

      {calm && greetings.length > 0 && <GreetingsCard greetings={greetings} onClose={closeGreetings} />}

      {calm && greetings.length === 0 && season && <SeasonGreetingCard greeting={season} onDone={closeSeason} />}

      {calm && greetings.length === 0 && !season && !born && seedGifts.length > 0 && (
        <SeedGift seeds={seedGifts} onClose={() => setSeedGifts([])} />
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
