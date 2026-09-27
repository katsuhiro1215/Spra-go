"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SceneBackground } from "@/components/app/scene-background";
import { StagePath, type StagePathNode } from "@/components/app/stage-path";
import { SpruFigure } from "@/components/spru/spru-figure";
import { Flag } from "@/components/travel/flag";
import { SouvenirStand } from "@/components/travel/souvenir-stand";
import { pickBeginnerGroup } from "@/components/travel/travel";
import type { Destination, ReceiveResult, TravelSouvenir } from "@/components/travel/types";
import { apiFetch } from "@/lib/api";

type CountryGroups = {
  groups: { category: { id: number; name: string; is_language_mode: boolean }; difficulty: string; locked: boolean; stages: StagePathNode[] }[];
};

/** 旅先の国の画面(設計書5-3)。まだ着いていない国・知らない国は旅のハブへ戻す */
export default function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [country, setCountry] = useState<CountryGroups | null>(null);
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
        if (data.country_id === null) return;
        const countryRes = await apiFetch(`/api/countries/${data.country_id}`);
        if (active && countryRes.ok) setCountry(await countryRes.json());
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
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  const group = country ? pickBeginnerGroup(country.groups) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-28">
        <Link href="/trip" className="self-start rounded-full bg-white/85 px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow">
          <AutoFurigana text="旅の地図へ戻る" />
        </Link>

        <section className="flex items-center gap-3 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg">
          <SpruFigure image="happy" standHeight={88} alt="よろこぶスプル" />
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

        <section aria-labelledby="trip-stages-title" className="flex flex-col gap-2">
          <h2 id="trip-stages-title" className="text-sm font-black text-white drop-shadow">
            <AutoFurigana text={`${destination.name}で学ぶ(初級)`} />
          </h2>
          {group ? (
            <StagePath stages={group.stages} onSelect={(stage) => router.push(`/quiz/${stage.id}`)} />
          ) : (
            <p className="text-sm text-white/85">
              <AutoFurigana text={country || destination.country_id === null ? "まだこの国のステージがありません。" : "読み込み中..."} />
            </p>
          )}
          {destination.country_id !== null && (
            <Link
              href={`/travel/${destination.country_id}`}
              className="self-center rounded-full bg-white/85 px-4 py-2 text-sm font-black text-[#2b5d7a] shadow"
            >
              <AutoFurigana text="もっと学ぶ(中級・上級)" />
            </Link>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
