"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { apiFetch } from "@/lib/api";

import type { ShopListItem, WorldData, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const DEFAULT_LINE = "もうすぐ旅に出られそう！ 学んでポイントをためよう";

type SpruState = { mood: "idle" | "joy"; line: string };

export function WorldScreen() {
  const router = useRouter();
  const { profile: sharedProfile, applyPartial } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [spru, setSpru] = useState<SpruState>({ mood: "idle", line: DEFAULT_LINE });
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const joyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cheer = useCallback((line: string) => {
    if (joyTimer.current) clearTimeout(joyTimer.current);
    setSpru({ mood: "joy", line });
    joyTimer.current = setTimeout(() => setSpru((prev) => ({ ...prev, mood: "idle" })), 2600);
  }, []);

  useEffect(() => () => {
    if (joyTimer.current) clearTimeout(joyTimer.current);
  }, []);

  useEffect(() => {
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
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial]);

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      cheer("ポイントでショップのアイテムを買ってみよう！");
    } finally {
      setWelcomeBusy(false);
    }
  }

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
    <div className="min-h-screen bg-[#8fd4e9]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} nextUnlock={nextUnlock} />

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={new Set()}
            placing={false}
            onTileTap={() => {}}
            onItemTap={(_item: WorldItem) => {}}
            spruMood={spru.mood}
            spruLine={spru.line}
            poppedItemId={null}
          />
        </div>

        <Link
          href={continueHref}
          className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
          つづきから学ぶ
        </Link>
      </div>

      <BottomNav />

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}
    </div>
  );
}
