"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { costumeImage } from "@/components/spru/costume";
import { ItemIcon } from "@/components/world/item-art";
import { cn } from "@/lib/utils";

import { buyCostume, buySeedItem, equipCostume, fetchSeedShop, type CostumeRow, type SeedShop, type ShopItemRow } from "./run-api";

type Tab = "costumes" | "items";
type Confirm = { kind: "costume"; row: CostumeRow } | { kind: "item"; row: ShopItemRow };

/**
 * タネ交換所(docs/design/2026-10-17-spru-costumes-design.md 6章)。ランのタネで、きせかえと、ラン限定の町のかざりを買う。
 * 買う前に確認を出す。持っているきせかえは、ここで着替える(「ふつうのスプル」に戻せる)
 */
export function RunShop() {
  const [shop, setShop] = useState<SeedShop | null>(null);
  const [tab, setTab] = useState<Tab>("costumes");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => void fetchSeedShop().then(setShop), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const buy = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    const done = confirm.kind === "costume" ? await buyCostume(confirm.row.key) : await buySeedItem(confirm.row.id);
    setBusy(false);
    setConfirm(null);
    setMessage(done ? (confirm.kind === "costume" ? "手に入れたよ！ 着てみよう" : "バッグに入れたよ！ 町におこう") : "買えませんでした。タネの数を見てね");
    reload();
  };

  const wear = async (key: string | null) => {
    await equipCostume(key);
    reload();
  };

  return (
    <main className="flex min-h-dvh justify-center bg-gradient-to-b from-[#8fd3ff] to-[#e8f7ff] px-4 py-6 text-[#3b3226]">
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-center text-2xl font-black">タネ交換所</h1>
        <p className="mx-auto rounded-full bg-white/90 px-4 py-1 text-sm font-black text-[#7a5a12]">
          <AutoFurigana text={`ランのタネ ${shop?.seeds ?? 0}個`} />
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(["costumes", "items"] as const).map((t) => (
            <button key={t} type="button" onClick={() => {
                setTab(t);
                setMessage(null);
              }} className={cn("h-11 rounded-full text-sm font-black", tab === t ? "bg-[#ffb02e] text-white" : "bg-white/80")}>
              {t === "costumes" ? "きせかえ" : "町のかざり"}
            </button>
          ))}
        </div>

        {message && <p className="rounded-2xl bg-white/90 px-3 py-2 text-center text-sm font-black">{message}</p>}

        {tab === "costumes" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
              <p className="text-sm font-black">ふつうのスプル</p>
              <AppButton variant={shop?.costume_key ? "default" : "primary"} size="sm" disabled={!shop?.costume_key} onClick={() => wear(null)}>
                {shop?.costume_key ? "もどす" : "着ているよ"}
              </AppButton>
            </div>
            {shop?.costumes.map((row) => {
              const image = costumeImage(row.key);
              return (
                <div key={row.key} className="flex flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                  {image && <Image src={image.src} alt="" width={image.width} height={image.height} unoptimized className="h-28 w-auto" />}
                  <p className="text-sm font-black">
                    <AutoFurigana text={row.name} />
                  </p>
                  {row.owned ? (
                    <AppButton variant={row.equipped ? "default" : "primary"} size="sm" disabled={row.equipped} onClick={() => wear(row.key)}>
                      {row.equipped ? "着ているよ" : "着る"}
                    </AppButton>
                  ) : (
                    <AppButton variant="primary" size="sm" disabled={!row.affordable} onClick={() => setConfirm({ kind: "costume", row })}>
                      {row.price}個
                    </AppButton>
                  )}
                </div>
              );
            })}
            {shop && shop.costumes.length === 0 && <p className="col-span-2 text-center text-sm font-bold">いまは、ならんでいるきせかえはないよ</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {shop?.items.map((row) => (
              <div key={row.id} className="flex flex-col items-center gap-2 rounded-3xl bg-[#fffaf0] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                <ItemIcon assetKey={row.asset_key} size={88} />
                <p className="text-sm font-black">
                  <AutoFurigana text={row.name} />
                </p>
                <AppButton variant="primary" size="sm" disabled={!row.affordable} onClick={() => setConfirm({ kind: "item", row })}>
                  {row.price}個
                </AppButton>
              </div>
            ))}
          </div>
        )}

        <Link href="/games/spru-run" className="text-center text-sm font-black underline">
          もどる
        </Link>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.5)] px-6">
          <div role="dialog" aria-modal="true" aria-labelledby="run-shop-confirm" className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center">
            <p id="run-shop-confirm" className="text-base font-black">
              <AutoFurigana text={`「${confirm.row.name}」を、タネ${confirm.row.price}個で買う？`} />
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <AppButton variant="default" onClick={() => setConfirm(null)}>
                やめる
              </AppButton>
              <AppButton variant="primary" disabled={busy} onClick={buy}>
                買う
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
