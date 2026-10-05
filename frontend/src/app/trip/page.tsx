"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AssetImage } from "@/components/app/asset-image";
import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { BadgeImage } from "@/components/app/badge-image";
import { SkyPage, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { SPRU_TRAVEL } from "@/components/spru/spru-assets";
import { DepartureScene } from "@/components/travel/departure-scene";
import { DestinationSheet } from "@/components/travel/destination-sheet";
import { hubLine } from "@/components/travel/travel";
import { TravelMap } from "@/components/travel/travel-map";
import type { DepartResult, Destination, TravelData } from "@/components/travel/types";
import { roadName } from "@/components/travel/road";
import { apiFetch } from "@/lib/api";
import { prefersReducedMotion } from "@/lib/motion";

/** せかい(docs/design/2026-09-28-travel-tickets-design.md 5-2)。チケットで好きな国へ行く */
export default function Page() {
  const router = useRouter();
  const [travel, setTravel] = useState<TravelData | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadBusy, setRoadBusy] = useState(false);
  const [roadMessage, setRoadMessage] = useState<string | null>(null);
  const [departing, setDeparting] = useState<{ destination: Destination; reduced: boolean } | null>(null);

  useEffect(() => {
    apiFetch("/api/travel")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 422) {
          router.replace("/profiles");
          return;
        }
        if (res.ok) setTravel(await res.json());
      })
      .catch(() => null);
  }, [router]);

  const open = travel?.destinations.find((destination) => destination.key === openKey) ?? null;
  const departingKey = departing?.destination.key ?? null;
  const handleArrived = useCallback(() => {
    if (departingKey) router.push(`/trip/${departingKey}`);
  }, [departingKey, router]);

  // 町の道を選ぶ(設計書 2026-10-05-road-style 4-3)。選べるのは日本と、着いた国だけ(サーバーも確かめる)
  async function selectRoad(style: string) {
    setRoadBusy(true);
    setRoadMessage(null);
    try {
      const res = await apiFetch("/api/world/road", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setRoadMessage(body?.message ?? "通信エラーが発生しました。");
        return;
      }
      setTravel((prev) => (prev ? { ...prev, road_style: body.road_style } : prev));
      setRoadMessage(style === "jp" ? "町の道を、日本の道にもどしたよ" : `町の道を、${roadName(style)}にしたよ`);
    } catch {
      setRoadMessage("通信エラーが発生しました。");
    } finally {
      setRoadBusy(false);
    }
  }

  async function depart(destination: Destination) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/travel/${destination.key}/depart`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message ?? "出発できませんでした。");
        return;
      }
      const result = body as DepartResult;
      setOpenKey(null);
      if (result.first) setDeparting({ destination: result.destination, reduced: prefersReducedMotion() });
      else router.push(`/trip/${destination.key}`);
    } catch {
      setError("通信に失敗しました。もう一度ためしてね。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-4 pb-28">
        <div className="flex items-center justify-between">
          <SkyTitle className="text-2xl">
            <AutoFurigana text="せかい" />
          </SkyTitle>
          <div className="flex items-center gap-2">
            {travel && travel.destinations.some((destination) => destination.state === "unvisited") && (
              <span
                aria-label={`チケット ${travel.tickets}まい`}
                className="flex items-center gap-1 rounded-full bg-[#fffaf0] py-1 pr-3 pl-2 text-xs font-black text-[#7a5a0e] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              >
                <AssetImage asset={SPRU_TRAVEL.ticket} size={20} />×{travel.tickets}
              </span>
            )}
            <Link
              href="/passport"
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] py-1 pr-3 pl-2 text-xs font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
            >
              <BadgeImage badge="passport" size={20} />
              パスポート
            </Link>
          </div>
        </div>
        {!travel ? (
          <SpruLoading />
        ) : (
          <TravelMap
            destinations={travel.destinations}
            line={hubLine(travel)}
            onSelect={(destination) => {
              setError(null);
              setRoadMessage(null);
              setOpenKey(destination.key);
            }}
          />
        )}
      </main>

      {open && (
        <DestinationSheet
          destination={open}
          ticketHint={travel?.ticket_hint ?? null}
          busy={busy}
          error={error}
          roadStyle={travel?.road_style ?? "jp"}
          roadBusy={roadBusy}
          roadMessage={roadMessage}
          onSelectRoad={selectRoad}
          onDepart={() => depart(open)}
          onGo={() => router.push(`/trip/${open.key}`)}
          onClose={() => setOpenKey(null)}
        />
      )}
      {departing && <DepartureScene destination={departing.destination} reduced={departing.reduced} onDone={handleArrived} />}
      <BottomNav />
    </SkyPage>
  );
}
