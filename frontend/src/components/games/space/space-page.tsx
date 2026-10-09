"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { SkyPage } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import type { CatchDifficulty, CatchSummary } from "@/components/games/catch/catch-api";
import { CatchSelect } from "@/components/games/catch/catch-select";
import { apiFetch } from "@/lib/api";

import { toGameQuestions, type SpaceFinish, type SpaceStart } from "./space-api";
import { answersOf, type SpaceState } from "./space-engine";
import { SpaceGame } from "./space-game";
import { SpaceResult } from "./space-result";

const API_PATH = "/api/games/space-trip";

type Phase =
  | { kind: "select" }
  | { kind: "playing"; start: SpaceStart }
  | { kind: "finishing" }
  | { kind: "result"; start: SpaceStart; state: SpaceState; result: SpaceFinish };

async function fetchSummary(): Promise<CatchSummary | "/login" | "/profiles" | null> {
  const res = await apiFetch(API_PATH);
  if (res.status === 401) return "/login";
  if (res.status === 422) return "/profiles";
  return res.ok ? res.json() : null;
}

/** ミニゲーム「うちゅう旅行」。選ぶ → 3・2・1 → ゲーム → 結果(docs/design/2026-10-09-space-trip-design.md 7章) */
export function SpacePageView() {
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();
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

  function refreshSummary() {
    fetchSummary()
      .then(applySummary)
      .catch(() => {});
  }

  async function start(difficulty: CatchDifficulty) {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_PATH}/plays`, { method: "POST", body: JSON.stringify({ difficulty }) });
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

  async function finish(started: SpaceStart, state: SpaceState) {
    setPhase({ kind: "finishing" });
    try {
      const res = await apiFetch(`${API_PATH}/plays/${started.play_id}/finish`, {
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
      refreshProfile().catch(() => {});
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
      <SpaceGame
        key={started.play_id}
        questions={toGameQuestions(started)}
        settings={{ lanes: started.lanes, fallMs: started.fall_ms, obstacleRows: started.obstacle_rows }}
        seed={started.play_id}
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
        <SpaceResult
          result={phase.result}
          state={phase.state}
          starting={starting}
          onRetry={() => start(phase.start.difficulty)}
          onChangeDifficulty={backToSelect}
        />
      ) : summary ? (
        <CatchSelect mode="space_trip" summary={summary} starting={starting} error={error} onStart={start} />
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
