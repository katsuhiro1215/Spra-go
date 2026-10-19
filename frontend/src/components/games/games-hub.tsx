"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { apiFetch } from "@/lib/api";
import { daysLeft, listedGames, MINI_QUIZ_EMPTY, todayJst, type ListedGame, type MiniQuiz, type RolloutGame } from "@/lib/mini-app";

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

/** ミニゲームの一覧(学ぶ画面の「ミニゲーム」ボタンから)。ミニゲームとミニクイズを並べる */
export function GamesHub() {
  const router = useRouter();
  const [games, setGames] = useState<ListedGame[] | null>(null);
  const [quizzes, setQuizzes] = useState<MiniQuiz[] | null>(null);
  const [ready, setReady] = useState(false);
  const [today] = useState(() => todayJst());

  useEffect(() => {
    let active = true;
    apiFetch("/api/profiles/active")
      .then(async (res) => {
        if (!active) return;
        if (!res.ok || !(await res.json())) {
          router.replace("/learn");
          return;
        }
        setReady(true);
        const [gamesRes, quizzesRes] = await Promise.all([apiFetch("/api/games"), apiFetch("/api/mini-quizzes")]);
        if (!active) return;
        setGames(listedGames(gamesRes.ok ? ((await gamesRes.json()) as RolloutGame[]) : []));
        setQuizzes(quizzesRes.ok ? await quizzesRes.json() : []);
      })
      .catch(() => active && router.replace("/login"));
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) return <LoadingScreen />;

  // 期間限定を先に
  const ordered = [...(games ?? [])].sort((a, b) => Number(b.limited) - Number(a.limited));

  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10 pb-24">
        <SkyTitle className="text-center text-3xl">
          <AutoFurigana text="ミニゲーム" />
        </SkyTitle>

        {ordered.map((game) => {
          const left = daysLeft(game.endsOn, today);
          return (
            <Link key={game.key} href={game.href}>
              <AppButton variant="warning" size="sm" className="h-auto w-full flex-col gap-1 py-3 shadow">
                {(game.new || game.featured || game.seasonal || game.limited) && (
                  <span className="flex flex-wrap justify-center gap-1 text-[11px] font-black">
                    {game.new && <span className="rounded-full bg-[#d94a3a] px-2 py-0.5 text-white">NEW</span>}
                    {game.limited && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[#3b3226]">
                        <AutoFurigana text={left ? `期間限定　あと${left}日` : "期間限定"} />
                      </span>
                    )}
                    {game.featured && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[#3b3226]">
                        <AutoFurigana text="今週のゲーム ごほうび1.5ばい" />
                      </span>
                    )}
                    {game.seasonal && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[#3b3226]">
                        <AutoFurigana text="きせつ" />
                      </span>
                    )}
                  </span>
                )}
                <span className="text-base">
                  <AutoFurigana text={game.title} />
                </span>
                <span className="text-xs font-bold opacity-80">
                  <AutoFurigana text={game.description} />
                </span>
              </AppButton>
            </Link>
          );
        })}

        <h2 className="mt-2 text-sm font-black text-[#3b3226]">
          <AutoFurigana text="ミニクイズ" />
        </h2>
        {!quizzes ? (
          <p className="text-xs text-[#6b5d45]">
            <AutoFurigana text="読み込み中..." />
          </p>
        ) : quizzes.length === 0 ? (
          <p className="text-xs text-[#6b5d45]">
            <AutoFurigana text={MINI_QUIZ_EMPTY} />
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {quizzes.map((quiz, index) => (
              <Link key={quiz.id} href={`/play/${quiz.id}`}>
                <AppButton variant={tileVariants[index % tileVariants.length]} size="sm" className="w-full shadow">
                  {quiz.name}
                </AppButton>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </SkyPage>
  );
}
