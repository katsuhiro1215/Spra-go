"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { PointsBadge } from "@/components/app/points-badge";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

type ItemType = "potion" | "plane" | "background" | "character" | "title";

const TYPE_ICON: Record<ItemType, string> = {
  potion: "🧪",
  plane: "✈️",
  background: "🖼️",
  character: "🧑",
  title: "🏅",
};

const TYPE_LABEL: Record<ItemType, string> = {
  potion: "回復薬",
  plane: "航空券",
  background: "背景",
  character: "キャラクター",
  title: "称号",
};

type ShopItem = {
  id: number;
  name: string;
  price: number;
  type: ItemType;
  meta: { heal?: number } | null;
};

type Profile = {
  id: number;
  hp: number;
  max_hp: number;
  coins: number;
};

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(
    undefined,
  );
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/profiles/active")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const activeProfile = res.ok ? await res.json() : null;
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }
        setProfile(activeProfile);
      })
      .catch(() => setProfile(null));

    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, [router]);

  async function handlePurchase(item: ShopItem) {
    setPurchasingId(item.id);
    setMessage(null);

    try {
      const res = await apiFetch(`/api/shop/${item.id}/purchase`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "購入に失敗しました。");
        return;
      }

      setProfile(data.profile);
      setMessage(`「${item.name}」を購入しました！`);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setPurchasingId(null);
    }
  }

  if (profile === undefined || items === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-white/80 drop-shadow hover:underline"
            >
              ← ホームに戻る
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              🛒 ショップ
            </h1>
          </div>
          <PointsBadge value={profile?.coins ?? 0} />
        </div>

        {message && (
          <p className="rounded-md bg-black/30 px-4 py-2 text-sm text-white shadow">
            {message}
          </p>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-white/85">
            まだアイテムがありません。お楽しみに。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const affordable = (profile?.coins ?? 0) >= item.price;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/30 bg-black/20 p-4 shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{TYPE_ICON[item.type]}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-white/70">
                        {TYPE_LABEL[item.type]}
                        {item.meta?.heal ? ` ・ HP+${item.meta.heal}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-300">
                      {item.price} Coin
                    </span>
                    <AppButton
                      variant={affordable ? "primary" : "locked"}
                      size="sm"
                      disabled={!affordable || purchasingId === item.id}
                      onClick={() => handlePurchase(item)}
                    >
                      {purchasingId === item.id ? "購入中..." : "購入"}
                    </AppButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
