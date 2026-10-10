"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import type { SpaceCard } from "@/components/games/space/space-map-api";
import { apiFetch } from "@/lib/api";

/** うちゅうずかん(docs/design/2026-10-10-space-adventure-map-design.md 2章)。宇宙の絵の問題に正解すると、カードが開く */
export default function SpaceCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<SpaceCard[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/api/space/cards")
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) return router.replace("/login");
        if (res.status === 422) return router.replace("/profiles");
        if (res.ok) setCards((await res.json()).cards);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [router]);

  const opened = cards?.filter((card) => card.unlocked).length ?? 0;

  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-8 pb-28 text-center">
        <SkyTitle className="text-2xl">
          <AutoFurigana text="うちゅうずかん" />
        </SkyTitle>
        {cards && (
          <SkyText className="text-sm">
            {opened}/{cards.length}
          </SkyText>
        )}
        {failed && (
          <SkyText className="text-sm">
            <AutoFurigana text="読み込めなかったよ" />
          </SkyText>
        )}
        {!cards && !failed && <SpruLoading />}
        {cards && cards.length === 0 && (
          <SkyText className="text-sm">
            <AutoFurigana text="宇宙のカードは じゅんびちゅうだよ" />
          </SkyText>
        )}
        <ul className="grid w-full grid-cols-3 gap-3">
          {cards?.map((card) => (
            <li key={card.key} className="flex flex-col items-center gap-1 rounded-2xl bg-[#fffaf0]/90 p-2 text-[#3b3226] shadow">
              <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-[#1d2a55]">
                {card.unlocked ? (
                  <Image src={card.image} alt={card.name ?? ""} fill sizes="100px" className="object-contain" unoptimized />
                ) : (
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white/50">
                    ？
                  </span>
                )}
              </span>
              <span className="text-xs font-bold">{card.unlocked ? <AutoFurigana text={card.name ?? ""} /> : "？？？"}</span>
            </li>
          ))}
        </ul>
        <Link href="/games/space-trip" className="w-full">
          <AppButton variant="warning" size="lg" className="w-full">
            <AutoFurigana text="うちゅう旅行へ" />
          </AppButton>
        </Link>
      </main>
      <BottomNav />
    </SkyPage>
  );
}
