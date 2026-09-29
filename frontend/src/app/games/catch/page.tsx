"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SkyPage } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import {
  toGameQuestions,
  type CatchDifficulty,
  type CatchFinish,
  type CatchStart,
  type CatchSummary,
} from "@/components/games/catch/catch-api";
import { answersOf, type CatchState } from "@/components/games/catch/catch-engine";
import { CatchGame } from "@/components/games/catch/catch-game";
import { CatchResult } from "@/components/games/catch/catch-result";
import { CatchSelect } from "@/components/games/catch/catch-select";
import { apiFetch } from "@/lib/api";

type Phase =
  | { kind: "select" }
  | { kind: "playing"; start: CatchStart }
  | { kind: "finishing" }
  | { kind: "result"; start: CatchStart; state: CatchState; result: CatchFinish };

/** 選ぶ画面の中身を読む。ログインしていない・プロフィールがないときは、移る先を返す */
async function fetchSummary(): Promise<CatchSummary | "/login" | "/profiles" | null> {
  const res = await apiFetch("/api/games/catch");
  if (res.status === 401) return "/login";
  if (res.status === 422) return "/profiles";
  return res.ok ? res.json() : null;
}

/** ミニゲーム1本目「スプルキャッチ」。選ぶ → 3・2・1 → ゲーム → 結果(docs/design/2026-09-29-spru-catch-design.md 7章) */
export default function CatchPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<CatchSummary | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "select" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySummary = useCallback(
    (result: CatchSummary | "/login" | "/profiles" | null) => {
      if (typeof result === "string") router.replace(result);
      else if (result) setSummary(result);
    },
    [router],
  );

  useEffect(() => {
    fetchSummary()
      .then(applySummary)
      .catch(() => setError("通信エラーが発生しました。"));
  }, [applySummary]);

  /** 遊んだあと・選ぶ画面に戻ったときに、自己ベストとごほうびの残りを読み直す */
  function refreshSummary() {
    fetchSummary()
      .then(applySummary)
      .catch(() => {});
  }

  async function start(difficulty: CatchDifficulty) {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/games/catch/plays", { method: "POST", body: JSON.stringify({ difficulty }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "始められませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "playing", start: data });
    } catch {
      setError("通信エラーが発生しました。");
      setPhase({ kind: "select" });
    } finally {
      setStarting(false);
    }
  }

  async function finish(started: CatchStart, state: CatchState) {
    setPhase({ kind: "finishing" });
    try {
      const res = await apiFetch(`/api/games/catch/plays/${started.play_id}/finish`, {
        method: "POST",
        body: JSON.stringify({ answers: answersOf(state) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "記録できませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "result", start: started, state, result: data });
    } catch {
      setError("通信エラーが発生しました。記録できませんでした。");
      setPhase({ kind: "select" });
    }
    refreshSummary();
  }

  function backToSelect() {
    setError(null);
    setPhase({ kind: "select" });
    refreshSummary();
  }

  if (phase.kind === "playing") {
    const started = phase.start;
    return (
      <CatchGame
        key={started.play_id}
        questions={toGameQuestions(started)}
        settings={{ lanes: started.lanes, fallMs: started.fall_ms }}
        onFinish={(state) => finish(started, state)}
        onQuit={backToSelect}
      />
    );
  }

  return (
    <SkyPage>
      <AppHeader />
      {phase.kind === "finishing" ? (
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <SpruLoading />
        </div>
      ) : phase.kind === "result" ? (
        <CatchResult
          result={phase.result}
          state={phase.state}
          starting={starting}
          onRetry={() => start(phase.start.difficulty)}
          onChangeDifficulty={backToSelect}
        />
      ) : summary ? (
        <CatchSelect summary={summary} starting={starting} error={error} onStart={start} />
      ) : (
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
          {error ? (
            <p role="alert" className="text-sm font-bold text-[#c9573b]">
              <AutoFurigana text={error} />
            </p>
          ) : (
            <SpruLoading />
          )}
        </div>
      )}
      <BottomNav />
    </SkyPage>
  );
}
