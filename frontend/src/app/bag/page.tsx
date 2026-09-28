"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Panel } from "@/components/app/panel";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { ItemIcon } from "@/components/world/item-art";
import type { WorldData } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

export default function Page() {
  const router = useRouter();
  const [world, setWorld] = useState<WorldData | null>(null);

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
      if (res.ok) setWorld(await res.json());
    });
  }, [router]);

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-8 pb-28">
        <SkyTitle className="text-2xl">
          <AutoFurigana text="バッグ" />
        </SkyTitle>
        <SkyText muted className="text-sm">
          <AutoFurigana text="まだ町に置いていないアイテムです。「置く」を押すと町で置く場所を選べます。" />
        </SkyText>

        {!world ? (
          <SpruLoading />
        ) : world.bag.length === 0 ? (
          <Panel className="flex flex-col items-start gap-3 text-sm">
            <AutoFurigana text="バッグはからっぽです。ショップで町のアイテムを買ってみよう。" />
            <Link href="/shop" className="rounded-full bg-[#3b7f26] px-4 py-2 font-bold text-white">
              ショップへ
            </Link>
          </Panel>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {world.bag.map((item) => (
              <li
                key={item.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[#fffaf0] p-3 text-[#3b3226] shadow-lg"
              >
                <div className="relative">
                  <ItemIcon assetKey={item.asset_key} size={64} />
                  {item.footprint > 1 && (
                    <span className="absolute -top-1 -left-4 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                      2×2マス
                    </span>
                  )}
                  {item.souvenir && (
                    <span className="absolute -right-4 -bottom-1 rounded-full bg-[#d8352a] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                      おみやげ
                    </span>
                  )}
                </div>
                <span className="text-sm font-black">{item.name}</span>
                <Link
                  href={`/?place=${item.id}`}
                  className="w-full rounded-xl bg-[#3b7f26] py-2 text-center text-sm font-black text-white"
                >
                  <AutoFurigana text="置く" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {world && (
          <SkyText muted className="text-xs">
            <AutoFurigana text={`町に置いているアイテム: ${world.items.length}こ`} />
          </SkyText>
        )}
      </main>

      <BottomNav />
    </SkyPage>
  );
}
