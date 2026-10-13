"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { AvatarBadge } from "@/components/app/avatar-badge";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { DIFFICULTY_READINGS } from "@/lib/difficulty";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

import { CATCH_MODES } from "../catch/catch-view";
import {
  boardUrl,
  rankText,
  RANKING_GAMES,
  valueText,
  type RankingBoard,
  type RankingPeriod,
  type RankingScope,
  type RankingSettings,
} from "./ranking-view";

const DIFFICULTIES = ["初級", "中級", "上級"] as const;

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-black",
        active ? "bg-[#3b7f26] text-white" : "bg-[#fffaf0] text-[#3b3226]",
      )}
    >
      {children}
    </button>
  );
}

/** ランキングの画面(docs/design/2026-10-13-ranking-design.md 3章)。家族／みんな × 級 × 期間 */
export function RankingScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const game = RANKING_GAMES[slug];
  const [scope, setScope] = useState<RankingScope>("family");
  const [difficulty, setDifficulty] = useState<string>("初級");
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RankingSettings | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    const query = scope === "public" ? "week" : period;
    apiFetch(boardUrl(slug, scope, difficulty, query))
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return router.replace("/login");
        if (res.status === 422) return router.replace("/profiles");
        setLocked(res.status === 403);
        setError(res.ok || res.status === 403 ? null : "ランキングを読み込めませんでした。");
        setBoard(res.ok ? await res.json() : null);
      })
      .catch(() => !cancelled && setError("通信エラーが発生しました。"));
    return () => {
      cancelled = true;
    };
  }, [slug, scope, difficulty, period, game, router, reload]);

  useEffect(() => {
    apiFetch("/api/ranking/settings")
      .then(async (res) => res.ok && setSettings(await res.json()))
      .catch(() => {});
  }, [reload]);

  if (!game) return null;
  const title = CATCH_MODES[game.mode].title;

  return (
    <SkyPage>
      <AppHeader />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-8 pb-24 text-center">
        <SkyTitle className="text-2xl">
          <AutoFurigana text="ランキング" />
        </SkyTitle>
        <SkyText className="text-sm">
          <AutoFurigana text={title} />
        </SkyText>

        <div className="flex gap-2">
          <Tab active={scope === "family"} onClick={() => setScope("family")}>
            <AutoFurigana text="かぞく" />
          </Tab>
          <Tab active={scope === "public"} onClick={() => setScope("public")}>
            <AutoFurigana text="みんな" />
          </Tab>
        </div>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <Tab key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_READINGS[d] ? <AutoFurigana text={d} /> : d}
            </Tab>
          ))}
        </div>
        {scope === "family" ? (
          <div className="flex gap-2">
            <Tab active={period === "week"} onClick={() => setPeriod("week")}>
              <AutoFurigana text="今週" />
            </Tab>
            <Tab active={period === "all"} onClick={() => setPeriod("all")}>
              <AutoFurigana text="ずっと" />
            </Tab>
          </div>
        ) : (
          <p className="text-xs font-bold text-white/90">
            <AutoFurigana text="今週のランキング（月曜日にリセット）" />
          </p>
        )}

        <div className="w-full rounded-3xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          {error ? (
            <p role="alert" className="text-sm font-bold text-[#c9573b]">
              <AutoFurigana text={error} />
            </p>
          ) : locked ? (
            <p className="text-sm font-bold">
              <AutoFurigana text="みんなのランキングは、おうちの人がオンにすると見られるよ" />
            </p>
          ) : !board ? (
            <SpruLoading />
          ) : board.rows.length === 0 ? (
            <p className="text-sm font-bold">
              <AutoFurigana text="まだ きろくが ないよ。あそんでみよう" />
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {board.rows.map((row) => (
                <li
                  key={`${row.rank}-${row.name ?? row.nickname}-${row.value}`}
                  className={cn("flex items-center gap-3 rounded-2xl px-3 py-2", row.is_me && "bg-[#e6f4d9] ring-2 ring-[#5bb33e]")}
                >
                  <span className="w-9 text-lg font-black">{rankText(row.rank)}</span>
                  <AvatarBadge avatar={row.avatar} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-black">{row.name ?? row.nickname}</span>
                  <span className="text-sm font-black">{valueText(game.time, row.value)}</span>
                </li>
              ))}
              {board.me && (
                <li className="mt-1 rounded-2xl bg-[#e6f4d9] px-3 py-2 text-sm font-black ring-2 ring-[#5bb33e]">
                  <AutoFurigana text={`あなたは ${rankText(board.me.rank)}　${valueText(game.time, board.me.value)}`} />
                </li>
              )}
            </ol>
          )}
          {game.time && !locked && (
            <p className="mt-3 text-xs text-[#6b5d45]">
              <AutoFurigana text="パズルは、同じ級どうしで くらべられるよ" />
            </p>
          )}
        </div>

        {settings && <ParentPanel settings={settings} onChanged={() => setReload((n) => n + 1)} />}

        <Link href={`/games/${slug}`} className="text-sm font-black text-white underline">
          <AutoFurigana text="ゲームにもどる" />
        </Link>
      </div>
      <BottomNav />
    </SkyPage>
  );
}

/** おうちの人向けの設定: みんなのランキングに参加するスイッチと、ニックネーム */
function ParentPanel({ settings, onChanged }: { settings: RankingSettings; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const send = useCallback(
    async (path: string, method: string, body: Record<string, unknown>, done: string) => {
      setBusy(true);
      setMessage(null);
      try {
        const res = await apiFetch(path, { method, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.message ?? "保存できませんでした。");
          return;
        }
        setPassword("");
        setMessage(done);
        onChanged();
      } catch {
        setMessage("通信エラーが発生しました。");
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  function toggle(event: FormEvent) {
    event.preventDefault();
    void send("/api/ranking/settings", "PUT", { public: !settings.public, password }, settings.public ? "オフにしました。" : "オンにしました。");
  }

  return (
    <div className="w-full rounded-3xl bg-[#fffaf0]/90 p-4 text-left text-[#3b3226]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left text-sm font-black">
        <AutoFurigana text="おうちの人へ（みんなのランキング）" />
      </button>
      {open && (
        <form onSubmit={toggle} className="mt-3 flex flex-col gap-3 text-sm">
          <p className="text-xs leading-relaxed">
            みんなのランキングには、ニックネーム・アバター・順位・記録だけが表示されます。お子さまの名前や学年、町は表示されません。参加は、オンにした家族だけです。
          </p>
          <p className="font-black">
            いまのニックネーム: {settings.nickname}　／　参加: {settings.public ? "オン" : "オフ"}
          </p>
          <label className="flex flex-col gap-1 text-xs font-bold">
            パスワード（オンにするときと、ニックネームを変えるときに必要です）
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" variant={settings.public ? "default" : "primary"} disabled={busy}>
              {settings.public ? "オフにする" : "オンにする"}
            </AppButton>
            <AppButton
              type="button"
              disabled={busy}
              onClick={() => void send("/api/ranking/nickname", "POST", { password }, "ニックネームを変えました。")}
            >
              ニックネームを変える
            </AppButton>
          </div>
          {message && (
            <p role="status" className="text-xs font-bold">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
