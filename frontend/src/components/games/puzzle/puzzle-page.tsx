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
import { CATCH_MODES } from "@/components/games/catch/catch-view";
import { apiFetch } from "@/lib/api";

import { missedOf, type PuzzleAnswer, type PuzzleFinish, type PuzzleStart } from "./puzzle-api";
import { PuzzleGame } from "./puzzle-game";
import { PuzzleResult } from "./puzzle-result";

type Mode = "puzzle_flag" | "puzzle_space";

type Phase =
  | { kind: "select" }
  | { kind: "playing"; start: PuzzleStart }
  | { kind: "finishing" }
  | { kind: "result"; start: PuzzleStart; answers: PuzzleAnswer[]; result: PuzzleFinish };

async function fetchSummary(path: string): Promise<CatchSummary | "/login" | "/profiles" | null> {
  const res = await apiFetch(path);
  if (res.status === 401) return "/login";
  if (res.status === 422) return "/profiles";
  return res.ok ? res.json() : null;
}

/** ミニゲーム「スライドパズル」。選ぶ → 3枚(パズル → 4択) → 結果(docs/design/2026-10-09-slide-puzzle-design.md 1章) */
export function PuzzlePageView({ mode }: { mode: Mode }) {
  const apiPath = CATCH_MODES[mode].apiPath;
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
    fetchSummary(apiPath)
      .then(applySummary)
      .catch(() => setError("通信エラーが発生しました。"));
  }, [apiPath, applySummary]);

  function refreshSummary() {
    fetchSummary(apiPath)
      .then(applySummary)
      .catch(() => {});
  }

  async function start(difficulty: CatchDifficulty) {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch(`${apiPath}/plays`, { method: "POST", body: JSON.stringify({ difficulty }) });
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

  async function finish(started: PuzzleStart, answers: PuzzleAnswer[], elapsedMs: number) {
    setPhase({ kind: "finishing" });
    try {
      const res = await apiFetch(`${apiPath}/plays/${started.play_id}/finish`, {
        method: "POST",
        body: JSON.stringify({ answers, elapsed_ms: elapsedMs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "記録できませんでした。");
        setPhase({ kind: "select" });
        return;
      }
      setPhase({ kind: "result", start: started, answers, result: data });
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
      <SkyPage>
        <AppHeader />
        <PuzzleGame
          key={started.play_id}
          start={started}
          onFinish={(answers, elapsedMs) => finish(started, answers, elapsedMs)}
          onQuit={backToSelect}
        />
        <BottomNav />
      </SkyPage>
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
        <PuzzleResult
          result={phase.result}
          total={phase.start.questions.length}
          missed={missedOf(phase.start.questions, phase.answers)}
          starting={starting}
          onRetry={() => start(phase.start.difficulty)}
          onChangeDifficulty={backToSelect}
        />
      ) : summary ? (
        <CatchSelect mode={mode} summary={summary} starting={starting} error={error} onStart={start} />
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
