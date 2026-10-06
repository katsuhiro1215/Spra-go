"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, FlaskConical, Image as ImageIcon, Plane, Store, User } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BadgeImage } from "@/components/app/badge-image";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { useProfile } from "@/components/app/profile-provider";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { WalletCards } from "@/components/app/wallet-cards";
import { isEmailVerified } from "@/components/auth/auth-flow";
import { EmailVerifyNotice } from "@/components/auth/email-verify-notice";
import {
  categoriesWithNew,
  inTab,
  isNewItem,
  pickTab,
  presentCategories,
  tabLabel,
  type ItemCategory,
} from "@/components/world/categories";
import { CategoryTabs } from "@/components/world/category-tabs";
import { ItemIcon } from "@/components/world/item-art";
import type { ShopListItem } from "@/components/world/types";
import { apiFetch } from "@/lib/api";
import { coinPackagesFrom, type CoinPackageInfo } from "@/lib/coin-packages";

type ItemType = "potion" | "plane" | "background" | "character" | "title" | "decoration";

// 町のアイテム(decoration)は絵文字ではなく ItemIcon で描くため含めない
const TYPE_ICON: Record<Exclude<ItemType, "decoration">, ReactNode> = {
  potion: <FlaskConical aria-hidden className="h-7 w-7 text-[#e5533f]" />,
  plane: <Plane aria-hidden className="h-7 w-7 text-[#2b6fa3]" />,
  background: <ImageIcon aria-hidden className="h-7 w-7 text-[#3b7f26]" />,
  character: <User aria-hidden className="h-7 w-7 text-[#6b5d45]" />,
  title: <Award aria-hidden className="h-7 w-7 text-[#c98f12]" />,
};

const TYPE_LABEL: Record<Exclude<ItemType, "decoration">, string> = {
  potion: "回復薬",
  plane: "航空券",
  background: "背景",
  character: "キャラクター",
  title: "称号",
};

type Profile = {
  id: number;
  hp: number;
  max_hp: number;
  coins: number;
  points: number;
  level: number;
};

function ShopContent() {
  const router = useRouter();
  const { applyPartial } = useProfile();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(
    undefined,
  );
  const [items, setItems] = useState<ShopListItem[] | null>(null);
  const [coinPackages, setCoinPackages] = useState<CoinPackageInfo[] | null>(
    null,
  );
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [purchasingPackageKey, setPurchasingPackageKey] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  // メールアドレスを確かめたか。確かめるまではコインを買えない(docs/design/2026-09-29-email-verify-reset-design.md 3-6)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [tab, setTab] = useState<ItemCategory | null>(null);

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

    apiFetch("/api/coin-packages").then(async (res) => {
      if (res.ok) setCoinPackages(coinPackagesFrom(await res.json()));
    });

    apiFetch("/api/user").then(async (res) => {
      if (res.ok) setEmailVerified(isEmailVerified(await res.json()));
    });
  }, [router]);

  useEffect(() => {
    (async () => {
      const purchase = searchParams.get("purchase");
      if (purchase === "success") {
        setMessage(
          "コインの購入ありがとうございます！反映まで少し時間がかかる場合があります。",
        );
        apiFetch("/api/profiles/active").then(async (res) => {
          if (res.ok) setProfile(await res.json());
        });
      } else if (purchase === "cancel") {
        setMessage("購入をキャンセルしました。");
      }
    })();
  }, [searchParams]);

  async function handleCoinPurchase(pkg: CoinPackageInfo) {
    setPurchasingPackageKey(pkg.key);
    setMessage(null);

    try {
      const res = await apiFetch("/api/coin-purchases/checkout", {
        method: "POST",
        body: JSON.stringify({ package_key: pkg.key }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setMessage(data.message ?? "購入手続きの開始に失敗しました。");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setMessage("通信エラーが発生しました。");
      setPurchasingPackageKey(null);
    }
  }

  async function handlePurchase(item: ShopListItem) {
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
      applyPartial({ coins: data.profile.coins, points: data.profile.points, hp: data.profile.hp });
      setMessage(`「${item.name}」を購入しました！`);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setPurchasingId(null);
    }
  }

  async function handleDecorationPurchase(item: ShopListItem) {
    setPurchasingId(item.id);
    setMessage(null);

    try {
      const res = await apiFetch(`/api/shop/${item.id}/purchase`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "購入に失敗しました。");
        return;
      }

      applyPartial({ points: data.profile.points, coins: data.profile.coins });
      router.push(`/?place=${data.world_item.id}`);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setPurchasingId(null);
    }
  }

  if (profile === undefined || items === null) {
    return (
      <LoadingScreen />
    );
  }

  const decorations = items.filter((item) => item.type === "decoration");
  const coinItems = items.filter((item) => item.type !== "decoration");
  const level = profile?.level ?? 1;
  const tabs = presentCategories(decorations);
  const currentTab = pickTab(tabs, tab);
  const newTabs = categoriesWithNew(decorations, level);

  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12 pb-24">
        <div className="flex flex-col gap-3">
          <BackLink />
          <SkyTitle className="flex items-center gap-2 text-3xl whitespace-nowrap">
            <Store aria-hidden className="h-7 w-7 shrink-0" />
            ショップ
          </SkyTitle>
          {/* ヘッダーは絵だけなので、ここで数字を見せる。2列で並べ、足りなければ1列に積む(右に置くと、タイトルや戻るボタンが崩れる) */}
          <WalletCards points={profile?.points ?? 0} coins={profile?.coins ?? 0} />
        </div>

        {message && (
          <p className="rounded-2xl bg-[#fffaf0] px-4 py-2 text-sm font-bold text-[#3b3226] shadow">
            {message}
          </p>
        )}

        {decorations.length > 0 && currentTab && (
          <section className="flex flex-col gap-3" aria-labelledby="shop-decorations">
            <h2 id="shop-decorations">
              <SkyText as="span" className="text-sm">
                <AutoFurigana text="町のアイテム(学習ポイントで買う)" />
              </SkyText>
            </h2>
            <CategoryTabs
              idBase="shop"
              label="町のアイテムの種類"
              tabs={tabs}
              selected={currentTab}
              onSelect={setTab}
              tabLabel={tabLabel}
              marked={newTabs}
            />
            <div
              role="tabpanel"
              id="shop-panel"
              aria-labelledby={`shop-tab-${currentTab}`}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {inTab(decorations, currentTab).map((item) => {
                const affordable = (profile?.points ?? 0) >= item.price;
                const label = item.locked
                  ? `Lv.${item.min_level}で解放`
                  : !affordable
                    ? "ポイント不足"
                    : purchasingId === item.id
                      ? "購入中..."
                      : "買って置く";
                return (
                  <div key={item.id} className="flex flex-col gap-1.5 rounded-2xl bg-[#fffaf0] p-2 text-[#3b3226] shadow-lg">
                    <div className="relative flex h-[74px] items-center justify-center rounded-xl bg-[#f5efe1]">
                      <ItemIcon assetKey={item.asset_key} size={64} />
                      {item.locked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[rgba(255,250,240,0.8)] text-center text-[10.5px] leading-tight font-black text-[#5a4526]">
                          <span>Lv.{item.min_level}</span>
                          <span>{affordable ? "ポイントはOK / レベルが足りない" : "レベルとポイントが必要"}</span>
                        </div>
                      )}
                      {item.footprint > 1 && (
                        <span className="absolute top-1 left-1 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          2×2マス
                        </span>
                      )}
                      {isNewItem(item, level) && (
                        <span className="absolute top-1 right-1 rounded-full bg-[#d8352a] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] font-black">{item.name}</p>
                    <p className="-mt-1 text-sm font-bold text-[#2e6b1c]">{item.price}pt</p>
                    <button
                      type="button"
                      disabled={item.locked || !affordable || purchasingId === item.id}
                      onClick={() => handleDecorationPurchase(item)}
                      className="h-9 rounded-xl bg-[#3b7f26] text-[12.5px] font-black text-white disabled:bg-[#efe5cf] disabled:text-[#6b5d45]"
                    >
                      <AutoFurigana text={label} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3" aria-labelledby="shop-coin-items">
          <h2 id="shop-coin-items">
            <SkyText as="span" className="text-sm">
              <AutoFurigana text="べんりアイテム(コインで買う)" />
            </SkyText>
          </h2>
          {coinItems.length === 0 ? (
            <SkyText muted className="text-sm">
              まだアイテムがありません。お楽しみに。
            </SkyText>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {coinItems.map((item) => {
                const affordable = (profile?.coins ?? 0) >= item.price;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5efe1]">{TYPE_ICON[item.type as Exclude<ItemType, "decoration">]}</span>
                      <div>
                        <p className="text-sm font-black text-[#3b3226]">
                          {item.name}
                        </p>
                        <p className="text-xs font-bold text-[#6b5d45]">
                          {TYPE_LABEL[item.type as Exclude<ItemType, "decoration">]}
                          {item.meta?.heal ? ` ・ HP+${item.meta.heal}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#7a5a0e]">
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
        </section>

        {coinPackages && coinPackages.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2>
              <SkyText as="span" className="inline-flex items-center gap-1 text-sm">
                <BadgeImage badge="coins" size={22} />
                コインを<Furigana text="購入" reading="こうにゅう" />
              </SkyText>
            </h2>
            {emailVerified === false && <EmailVerifyNotice />}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {coinPackages.map((pkg) => (
                <div
                  key={pkg.key}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-[#fffaf0] p-4 text-center text-[#3b3226] shadow-lg"
                >
                  <p className="text-sm font-black text-[#3b3226]">
                    {pkg.label}
                  </p>
                  <p className="text-lg font-black text-[#7a5a0e]">
                    ¥{pkg.amount.toLocaleString()}
                  </p>
                  <AppButton
                    variant={emailVerified === false ? "locked" : "warning"}
                    size="sm"
                    disabled={purchasingPackageKey === pkg.key || emailVerified === false}
                    onClick={() => handleCoinPurchase(pkg)}
                    className="w-full normal-case"
                  >
                    {purchasingPackageKey === pkg.key
                      ? "手続き中..."
                      : "購入する"}
                  </AppButton>
                </div>
              ))}
            </div>
            <SkyText muted className="text-xs">
              決済はStripeを利用します。カード情報は当サービスには保存されません。
            </SkyText>
          </div>
        )}
      </div>

      <BottomNav />
    </SkyPage>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <LoadingScreen />
      }
    >
      <ShopContent />
    </Suspense>
  );
}
