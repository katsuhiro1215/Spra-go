"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { costumeImage } from "@/components/spru/costume";

import { buySwimCostume, equipCostume, fetchSwimCoinShop, type CostumeRow, type SwimCoinShop } from "./swim-api";

/**
 * スイムコイン交換所(docs/design/2026-10-17-spru-costumes-design.md 10章)。スイムコインで、きせかえを買う。
 * 買う前に確認を出す。持っているきせかえは、ここで着替える(「ふつうのスプル」に戻せる。タネ交換所と共有の1着)
 */
export function SwimShop() {
  const [shop, setShop] = useState<SwimCoinShop | null>(null);
  const [confirm, setConfirm] = useState<CostumeRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => void fetchSwimCoinShop().then(setShop), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const buy = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    const done = await buySwimCostume(confirm.key);
    setBusy(false);
    setConfirm(null);
    setMessage(done ? "手に入れたよ！ 着てみよう" : "買えませんでした。スイムコインの数を見てね");
    reload();
  };

  const wear = async (key: string | null) => {
    await equipCostume(key);
    reload();
  };

  return (
    <main className="flex min-h-dvh justify-center bg-gradient-to-b from-[#8fd3ff] to-[#1c8fe0] px-4 py-6 text-[#3b3226]">
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-center text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">スイムコイン交換所</h1>
        <p className="mx-auto rounded-full bg-white/90 px-4 py-1 text-sm font-black text-[#7a5a12]">
          <AutoFurigana text={`スイムコイン ${shop?.coins ?? 0}個`} />
        </p>

        {message && <p className="rounded-2xl bg-white/90 px-3 py-2 text-center text-sm font-black">{message}</p>}

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
                  <AppButton variant="primary" size="sm" disabled={!row.affordable} onClick={() => setConfirm(row)}>
                    {row.price}個
                  </AppButton>
                )}
              </div>
            );
          })}
          {shop && shop.costumes.length === 0 && <p className="col-span-2 text-center text-sm font-bold">いまは、ならんでいるきせかえはないよ</p>}
        </div>

        <Link href="/games/spru-swim" className="text-center text-sm font-black text-white underline">
          もどる
        </Link>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,30,0.5)] px-6">
          <div role="dialog" aria-modal="true" aria-labelledby="swim-shop-confirm" className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-[#fffaf0] p-6 text-center">
            <p id="swim-shop-confirm" className="text-base font-black">
              <AutoFurigana text={`「${confirm.name}」を、スイムコイン${confirm.price}個で買う？`} />
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
