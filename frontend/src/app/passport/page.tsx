"use client";

import Image from "next/image";

import { AppHeader } from "@/components/app/app-header";
import { SceneBackground } from "@/components/app/scene-background";

// UIモックアップ段階(2026-07-31)。実データ配線(達成状況・称号・思い出の日付)は
// UIの方向性が固まってから /api/passport 等を新設して行う。
type StampTier = "none" | "bronze" | "silver" | "gold";

type PassportCountry = {
  code: string;
  name: string;
  moodEmoji: string;
  stampTier: StampTier;
  unlockedDifficulties: string[];
  firstClearedAt: string | null;
};

const ALL_DIFFICULTIES = ["初級", "中級", "上級"];

const MOCK_COUNTRIES: PassportCountry[] = [
  {
    code: "jp",
    name: "日本",
    moodEmoji: "🎌",
    stampTier: "gold",
    unlockedDifficulties: ["初級", "中級", "上級"],
    firstClearedAt: "2026-07-20",
  },
  {
    code: "us",
    name: "アメリカ",
    moodEmoji: "🗽",
    stampTier: "silver",
    unlockedDifficulties: ["初級", "中級"],
    firstClearedAt: "2026-07-25",
  },
  {
    code: "fr",
    name: "フランス",
    moodEmoji: "🥐",
    stampTier: "bronze",
    unlockedDifficulties: ["初級"],
    firstClearedAt: "2026-07-28",
  },
  {
    code: "gb",
    name: "イギリス",
    moodEmoji: "☂️",
    stampTier: "none",
    unlockedDifficulties: [],
    firstClearedAt: null,
  },
];

const MOCK_TITLES = [
  "国旗マスター見習い",
  "英語はじめの一歩",
  "イギリス英語マスター見習い",
];

const STAMP_STYLES: Record<
  StampTier,
  { icon: string; ring: string; label: string }
> = {
  gold: {
    icon: "🥇",
    ring: "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]",
    label: "全難易度クリア",
  },
  silver: {
    icon: "🥈",
    ring: "border-slate-300 shadow-[0_0_0_3px_rgba(203,213,225,0.3)]",
    label: "中級までクリア",
  },
  bronze: {
    icon: "🥉",
    ring: "border-orange-400 shadow-[0_0_0_3px_rgba(251,146,60,0.3)]",
    label: "初級クリア",
  },
  none: {
    icon: "❔",
    ring: "border-white/20",
    label: "未訪問",
  },
};

export default function Page() {
  const visitedCountries = MOCK_COUNTRIES.filter((c) => c.stampTier !== "none");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            📔 マイパスポート
          </h1>
          <p className="mt-1 text-sm text-white/85 drop-shadow">
            旅の成果がすべて残る場所
          </p>
        </div>

        {/* サマリー */}
        <div className="mx-auto flex flex-wrap justify-center gap-3">
          <SummaryBadge
            label="訪れた国"
            value={`${visitedCountries.length} / ${MOCK_COUNTRIES.length}`}
          />
          <SummaryBadge label="称号" value={`${MOCK_TITLES.length}個`} />
          <SummaryBadge
            label="航空券"
            value={`${visitedCountries.length}枚`}
          />
        </div>

        {/* パスポート帳本体(紙のような見た目で他画面と質感を変える) */}
        <div className="rounded-3xl border-4 border-amber-900/30 bg-[#faf3e3] p-6 text-amber-950 shadow-2xl sm:p-8">
          {/* スタンプ一覧 */}
          <section>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-900/80">
              国スタンプ
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {MOCK_COUNTRIES.map((country) => {
                const stamp = STAMP_STYLES[country.stampTier];
                return (
                  <div
                    key={country.code}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-amber-900/15 bg-white/60 p-3 text-center"
                  >
                    <div
                      className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white ${stamp.ring} ${
                        country.stampTier === "none"
                          ? "grayscale"
                          : "rotate-[-6deg]"
                      }`}
                    >
                      <div className="relative h-10 w-14 overflow-hidden rounded-sm border border-amber-900/20">
                        <Image
                          src={`/flag/${country.code}.svg`}
                          alt={country.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="absolute -right-2 -bottom-2 text-xl drop-shadow">
                        {stamp.icon}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">
                      {country.moodEmoji} {country.name}
                    </p>
                    <p className="text-[11px] text-amber-900/60">
                      {stamp.label}
                    </p>
                    <div className="flex gap-1">
                      {ALL_DIFFICULTIES.map((difficulty) => {
                        const unlocked =
                          country.unlockedDifficulties.includes(difficulty);
                        return (
                          <span
                            key={difficulty}
                            title={`${difficulty}${unlocked ? "解放済み" : "未解放"}`}
                            className="text-xs"
                          >
                            {unlocked ? "🔑" : "🔒"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 称号 */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-900/80">
              獲得した称号
            </h2>
            {MOCK_TITLES.length === 0 ? (
              <p className="text-sm text-amber-900/60">
                まだ称号を獲得していません。ボスステージをクリアしてみよう。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {MOCK_TITLES.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm"
                  >
                    🏆 {title}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 航空券 */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-900/80">
              集めた航空券
            </h2>
            {visitedCountries.length === 0 ? (
              <p className="text-sm text-amber-900/60">
                国をクリアすると航空券がもらえます。
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {visitedCountries.map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center gap-2 rounded-lg border-2 border-dashed border-amber-900/30 bg-white/70 px-3 py-2 text-xs font-semibold"
                  >
                    <span>✈️</span>
                    <span className="relative h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-amber-900/20">
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
            <h2 className="mb-3 text-sm font-bold tracking-wide text-amber-900/80">
              旅の思い出
            </h2>
            {visitedCountries.length === 0 ? (
              <p className="text-sm text-amber-900/60">
                まだ思い出がありません。
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {visitedCountries
                  .filter((c) => c.firstClearedAt)
                  .sort((a, b) =>
                    (b.firstClearedAt ?? "").localeCompare(
                      a.firstClearedAt ?? "",
                    ),
                  )
                  .map((country) => (
                    <li
                      key={country.code}
                      className="flex items-center gap-2 border-b border-amber-900/10 pb-2"
                    >
                      <span className="text-xs text-amber-900/60">
                        {country.firstClearedAt}
                      </span>
                      <span>
                        🎉 {country.moodEmoji} {country.name}
                        を初めて制覇した！
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/30 bg-black/20 px-4 py-2 text-white backdrop-blur-sm">
      <span className="text-[10px] text-white/70">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
