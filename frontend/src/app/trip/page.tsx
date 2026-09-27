"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { DepartureScene } from "@/components/travel/departure-scene";
import { DestinationSheet } from "@/components/travel/destination-sheet";
import { hubLine } from "@/components/travel/travel";
import { TravelMap } from "@/components/travel/travel-map";
import type { DepartResult, Destination, TravelData } from "@/components/travel/types";
import { apiFetch } from "@/lib/api";
import { prefersReducedMotion } from "@/lib/motion";

/** 旅のハブ(設計書5-1)。「旅する」タブ */
export default function Page() {
  const router = useRouter();
  const [travel, setTravel] = useState<TravelData | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#8fd3f0]">
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-4 pb-28">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            <AutoFurigana text="旅する" />
          </h1>
          <Link href="/passport" className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow">
            パスポート
          </Link>
        </div>
        {!travel ? (
          <p className="text-sm text-white">読み込み中...</p>
        ) : (
          <TravelMap
            destinations={travel.destinations}
            line={hubLine(travel.destinations)}
            onSelect={(destination) => {
              setError(null);
              setOpenKey(destination.key);
            }}
          />
        )}
      </main>

      {open && (
        <DestinationSheet
          destination={open}
          busy={busy}
          error={error}
          onDepart={() => depart(open)}
          onGo={() => router.push(`/trip/${open.key}`)}
          onClose={() => setOpenKey(null)}
        />
      )}
      {departing && <DepartureScene destination={departing.destination} reduced={departing.reduced} onDone={handleArrived} />}
      <BottomNav />
    </div>
  );
}
