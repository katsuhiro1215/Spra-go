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
import type { SpaceMapState, SpaceStop } from "./space-map-api";
import { SpaceMap } from "./space-map";
import { answersOf, type SpaceState } from "./space-engine";
import { SpaceGame } from "./space-game";
import { SpaceResult } from "./space-result";

const API_PATH = "/api/games/space-trip";

type Phase =
  | { kind: "select" }
  | { kind: "playing"; start: SpaceStart & { stop?: string | null } }
  | { kind: "finishing" }
  | { kind: "result"; start: SpaceStart; state: SpaceState; result: SpaceFinish; stop: string | null };

/** 宇宙ぼうけんマップの状態(docs/design/2026-10-10-space-adventure-map-design.md 3-1)。読めなければ、今までの難しさの選択に戻る */
async function fetchMap(): Promise<SpaceMapState | null> {
  const res = await apiFetch(`${API_PATH}/map`);
  return res.ok ? res.json() : null;
}

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
  const [map, setMap] = useState<SpaceMapState | null>(null);
  const [practice, setPractice] = useState(false);
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
    fetchMap().then(setMap).catch(() => {});
  }, [applySummary]);

  function refreshSummary() {
    fetchSummary()
      .then(applySummary)
      .catch(() => {});
    fetchMap().then(setMap).catch(() => {});
  }

  /** 地図の星から(stop)、またはれんしゅう(difficulty)で始める */
  async function start(by: { difficulty: CatchDifficulty } | { stop: string }) {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_PATH}/plays`, { method: "POST", body: JSON.stringify(by) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "始められませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "playing", start: { ...data, stop: "stop" in by ? by.stop : null } });
    } catch {
      setError("通信エラーが発生しました。");
      setPhase({ kind: "select" });
    } finally {
      setStarting(false);
    }
  }

  async function finish(started: SpaceStart & { stop?: string | null }, state: SpaceState) {
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
      setPhase({ kind: "result", start: started, state, result: data, stop: started.stop ?? null });
      refreshProfile().catch(() => {});
    } catch {
      setError("通信エラーが発生しました。記録できませんでした。");
      setPhase({ kind: "select" });
    }
    refreshSummary();
  }

  function backToSelect() {
    setError(null);
    setPractice(false);
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
          stops={map?.stops ?? []}
          onRetry={() => start(phase.stop ? { stop: phase.stop } : { difficulty: phase.start.difficulty })}
          onChangeDifficulty={backToSelect}
        />
      ) : map && !practice ? (
        <SpaceMap map={map} starting={starting} error={error} onStart={(stop: SpaceStop) => start({ stop: stop.key })} onPractice={() => setPractice(true)} />
      ) : summary ? (
        <CatchSelect mode="space_trip" summary={summary} starting={starting} error={error} onStart={(difficulty) => start({ difficulty })} />
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
