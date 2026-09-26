"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SceneBackground } from "@/components/app/scene-background";
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
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-8 pb-28">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          <AutoFurigana text="バッグ" />
        </h1>
        <p className="text-sm text-white/85 drop-shadow">
          <AutoFurigana text="まだ町に置いていないアイテムです。「置く」を押すと町で置く場所を選べます。" />
        </p>

        {!world ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : world.bag.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-black/25 p-4 text-sm text-white">
            <AutoFurigana text="バッグはからっぽです。ショップで町のアイテムを買ってみよう。" />
            <Link href="/shop" className="rounded-full bg-[#3b7f26] px-4 py-2 font-bold text-white">
              ショップへ
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {world.bag.map((item) => (
              <li
                key={item.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[#fffaf0] p-3 text-[#3b3226] shadow-lg"
              >
                <ItemIcon assetKey={item.asset_key} size={64} />
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
          <p className="text-xs text-white/70">
            <AutoFurigana text={`町に置いているアイテム: ${world.items.length}こ`} />
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
