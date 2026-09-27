"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleHelp, KeyRound, Lock, PartyPopper, Plane, Trophy } from "lucide-react";

import { AppHeader } from "@/components/app/app-header";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { BadgeImage } from "@/components/app/badge-image";
import { stampBadge, type StampTier } from "@/components/app/palette";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { apiFetch } from "@/lib/api";

type PassportCountry = {
  code: string;
  name: string;
  mood_emoji: string | null;
  stamp_tier: StampTier;
  unlocked_difficulties: string[];
  first_cleared_at: string | null;
};

type PassportData = {
  countries: PassportCountry[];
  titles: string[];
  visited_count: number;
};

const ALL_DIFFICULTIES = ["初級", "中級", "上級"];

export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<PassportData | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let active = true;

    apiFetch("/api/passport")
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

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込み中...
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込みに失敗しました。
      </div>
    );
  }

  const { countries, titles, visited_count: visitedCount } = data;
  const visitedCountries = countries.filter((c) => c.stamp_tier !== "none");

  return (
    <SkyPage>
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 pb-24">
        <div>
          <BackLink />
        </div>

        <div className="text-center">
          <SkyTitle className="flex items-center justify-center gap-2 text-3xl">
            <BadgeImage badge="passport" size={36} />
            マイパスポート
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            旅の成果がすべて残る場所
          </SkyText>
        </div>

        {/* サマリー */}
        <div className="mx-auto flex flex-wrap justify-center gap-3">
          <SummaryBadge
            label="訪れた国"
            value={`${visitedCount} / ${countries.length}`}
          />
          <SummaryBadge label="称号" value={`${titles.length}個`} />
          <SummaryBadge label="航空券" value={`${visitedCount}枚`} />
        </div>

        {/* パスポート帳本体(紙のような見た目で他画面と質感を変える) */}
        <div className="rounded-3xl border-4 border-[#e8dfcf] bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] sm:p-8">
          {/* スタンプ一覧 */}
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-[#6b5d45]">
              国スタンプ
            </h2>
            {countries.length === 0 ? (
              <p className="text-sm text-[#8a7a5a]">
                まだ国が登録されていません。
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {countries.map((country) => {
                  const stamp = stampBadge(country.stamp_tier);
                  return (
                    <div
                      key={country.code}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-[#efe5cf] bg-white p-3 text-center"
                    >
                      <div
                        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white ${stamp.ring} ${
                          country.stamp_tier === "none"
                            ? "grayscale"
                            : "-rotate-6"
                        }`}
                      >
                        <div className="relative h-10 w-14 overflow-hidden rounded-sm border border-[#efe5cf]">
                          <Image
                            src={`/flag/${country.code}.svg`}
                            alt={country.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="absolute -right-4 -bottom-3">
                          {stamp.badge ? (
                            <BadgeImage badge={stamp.badge} size={40} />
                          ) : (
                            <span className="flex rounded-full bg-white p-0.5 shadow">
                              <CircleHelp aria-hidden className="h-6 w-6 text-[#b9ad96]" />
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-black">
                        {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                        {country.name}
                      </p>
                      <p className="text-[11px] font-bold text-[#8a7a5a]">
                        {stamp.label}
                      </p>
                      <div className="flex gap-1">
                        {ALL_DIFFICULTIES.map((difficulty) => {
                          const unlocked =
                            country.unlocked_difficulties.includes(
                              difficulty,
                            );
                          return (
                            <span
                              key={difficulty}
                              title={`${difficulty}${unlocked ? "解放済み" : "未解放"}`}
                              className="text-xs"
                            >
                              {unlocked ? (
                                <KeyRound aria-hidden className="h-3.5 w-3.5 text-[#c98f12]" />
                              ) : (
                                <Lock aria-hidden className="h-3.5 w-3.5 text-[#b9ad96]" />
                              )}
                              <span className="sr-only">{`${difficulty}${unlocked ? "解放済み" : "未解放"}`}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 称号 */}
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-[#6b5d45]">
              <BadgeImage badge="crown" size={32} />
              獲得した称号
            </h2>
            {titles.length === 0 ? (
              <p className="text-sm text-[#8a7a5a]">
                まだ称号を獲得していません。ボスステージをクリアしてみよう。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {titles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-[#f2b632] bg-[#fff4d6] px-3 py-1 text-xs font-semibold text-[#7a5a0e] shadow-sm"
                  >
                    <Trophy aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                    {title}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 航空券 */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-[#6b5d45]">
              集めた航空券
            </h2>
            {visitedCountries.length === 0 ? (
              <p className="text-sm text-[#8a7a5a]">
                国をクリアすると航空券がもらえます。
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {visitedCountries.map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[#d9cdb4] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    <Plane aria-hidden className="h-3.5 w-3.5 text-[#2b6fa3]" />
                    <span className="relative h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-[#efe5cf]">
                      <Image
                        src={`/flag/${country.code}.svg`}
                        alt={country.name}
                        fill
                        className="object-cover"
                      />
                    </span>
                    {country.name}行き
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 旅の思い出 */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-[#6b5d45]">
              旅の思い出
            </h2>
            {visitedCountries.length === 0 ? (
              <p className="text-sm text-[#8a7a5a]">
                まだ思い出がありません。
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {visitedCountries
                  .filter((c) => c.first_cleared_at)
                  .sort((a, b) =>
                    (b.first_cleared_at ?? "").localeCompare(
                      a.first_cleared_at ?? "",
                    ),
                  )
                  .map((country) => (
                    <li
                      key={country.code}
                      className="flex items-center gap-2 border-b border-[#efe5cf] pb-2"
                    >
                      <span className="text-xs text-[#8a7a5a]">
                        {country.first_cleared_at}
                      </span>
                      <span>
                        <PartyPopper aria-hidden className="mr-1 inline h-4 w-4 text-[#c98f12]" />
                        {country.mood_emoji ? `${country.mood_emoji} ` : ""}
                        {country.name}
                        を初めて制覇した！
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <BottomNav />
    </SkyPage>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-[#fffaf0] px-4 py-2 text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.15)]">
      <span className="text-[10px] font-bold text-[#6b5d45]">{label}</span>
      <span className="text-lg font-black">{value}</span>
    </div>
  );
}
