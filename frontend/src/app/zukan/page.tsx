"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { apiFetch } from "@/lib/api";
import { isZukanComplete, zukanImage, zukanProgress, type ZukanData, type ZukanItem } from "@/lib/zukan";

/** パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)。おつかいの3つ目をそろえるともらえる */
export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<ZukanData | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    apiFetch("/api/zukan")
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setData(res.ok ? await res.json() : null);
      })
      .catch(() => {
        if (active) setData(null);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (data === undefined) return <LoadingScreen />;

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込みに失敗しました。
      </div>
    );
  }

  const complete = isZukanComplete(data.owned_count, data.total);

  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 pb-24">
        <div>
          <BackLink />
        </div>

        <div className="text-center">
          <SkyTitle className="text-3xl">
            <AutoFurigana text="パンとやさいのずかん" />
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            <AutoFurigana text="毎日のおつかいを3つそろえると、パン屋さんからもらえるよ" />
          </SkyText>
        </div>

        <div className="mx-auto rounded-full bg-white/80 px-5 py-1.5 text-lg font-black text-[#3b3226]">
          {zukanProgress(data.owned_count, data.total)}
        </div>

        {complete && (
          <p className="mx-auto rounded-2xl bg-[#fff3c4] px-5 py-2 text-base font-black text-[#8a6a1c]">
            <AutoFurigana text="ぜんぶそろった！" />
          </p>
        )}

        <div className="rounded-3xl border-4 border-[#e8dfcf] bg-[#fffaf0] p-4 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] sm:p-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.items.map((item) => (
              <ZukanCard key={item.key} item={item} />
            ))}
          </ul>
        </div>
      </div>

      <BottomNav />
    </SkyPage>
  );
}

function ZukanCard({ item }: { item: ZukanItem }) {
  const image = zukanImage(item.key);
  return (
    <li className="flex flex-col items-center gap-1 rounded-2xl border border-[#efe5cf] bg-white p-3 text-center">
      <div className="flex h-24 w-full items-center justify-center rounded-xl bg-[#f5efe1]">
        {image && (
          <AssetImage
            asset={image}
            size={80}
            alt={item.owned && item.name ? item.name : undefined}
            className={item.owned ? "" : "opacity-20 brightness-0"}
          />
        )}
      </div>
      {item.owned && item.name ? (
        <>
          <p className="text-sm font-black">
            <AutoFurigana text={item.name} />
          </p>
          <p className="text-xs font-bold text-[#8a7a5a]">{item.english}</p>
        </>
      ) : (
        <>
          <p className="text-sm font-black text-[#b9ad96]">？？？</p>
          <p className="text-xs font-bold text-transparent select-none" aria-hidden>
            -
          </p>
        </>
      )}
    </li>
  );
}
