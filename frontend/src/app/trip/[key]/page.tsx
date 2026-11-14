"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { SpruFigure } from "@/components/spru/spru-figure";
import { Flag } from "@/components/travel/flag";
import { SouvenirStand } from "@/components/travel/souvenir-stand";
import type { Destination, ReceiveResult, TravelSouvenir } from "@/components/travel/types";
import { apiFetch } from "@/lib/api";

/**
 * 旅先の国の画面(設計書5-3)。まだ着いていない国・知らない国は旅のハブへ戻す。
 * クイズのステージ一覧は置かない(2026-11-14追記): 「学ぶ」と中身が重複して分かりにくいという指摘から、
 * この画面はあいさつ・おみやげだけにし、クイズは必ず「学ぶ」(`/travel/{countryId}/start`)に一本化する
 */
export default function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/travel/${key}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          router.replace("/trip");
          return;
        }
        const data: Destination = await res.json();
        if (!active) return;
        setDestination(data);
      })
      .catch(() => {
        if (active) router.replace("/trip");
      });
    return () => {
      active = false;
    };
  }, [key, router]);

  async function receive(souvenir: TravelSouvenir) {
    setBusyKey(souvenir.key);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/travel/${key}/souvenirs/${souvenir.key}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ text: body?.message ?? "受け取れませんでした。", ok: false });
        return;
      }
      setDestination((body as ReceiveResult).destination);
      setMessage({ text: "バッグに入れたよ。町に置いてみよう！", ok: true });
    } catch {
      setMessage({ text: "通信に失敗しました。もう一度ためしてね。", ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  if (!destination) {
    return <LoadingScreen />;
  }

  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-28">
        <Link href="/trip" className="self-start rounded-full bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white">
          <AutoFurigana text="旅の地図へ戻る" />
        </Link>

        <section className="flex items-center gap-3 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg">
          <SpruFigure image="happy" standHeight={88} alt="よろこぶスプラ" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <Flag src={destination.flag} size={32} />
              {destination.name}
            </h1>
            <p className="text-lg font-black text-[#2b6fa3]">{destination.greeting.text}</p>
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text={`「${destination.greeting.reading}」は、${destination.name}のことばで「ようこそ」`} />
            </p>
          </div>
        </section>

        <SouvenirStand destination={destination} busyKey={busyKey} message={message} onReceive={receive} />

        {destination.country_id !== null && (
          <AppButton
            variant="primary"
            size="lg"
            className="w-full normal-case"
            onClick={() => router.push(`/travel/${destination.country_id}/start`)}
          >
            <AutoFurigana text={`${destination.name}を学ぶ`} />
          </AppButton>
        )}
      </main>
      <BottomNav />
    </SkyPage>
  );
}
