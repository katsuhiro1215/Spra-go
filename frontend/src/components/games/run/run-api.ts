import { apiFetch } from "@/lib/api";

/** GET /api/games/spru-run(と、始める・やめる・終えるの答えに入る入口の情報)。docs/design/2026-10-22-spru-run-design.md 14-3 */
export type RunSummary = {
  best_score: number | null;
  real_plays_left: number;
  real_plays_per_day: number;
  seeds: number;
  bonus_available: boolean;
  bonus: number;
  limited: boolean;
  ends_on: string | null;
  days_left: number | null;
};

export type RunStart = RunSummary & { play_id: number; seed: number; ceiling: number };
export type RunFinish = RunSummary & { score: number; distance_m: number; seed_value: number; seeds_earned: number; bonus: number; rank: number | null };

async function json<T>(response: Response): Promise<T | null> {
  return response.ok ? ((await response.json()) as T) : null;
}

export async function fetchRunSummary(): Promise<RunSummary | null> {
  return json<RunSummary>(await apiFetch("/api/games/spru-run"));
}

export async function startRealRun(ceiling: number): Promise<RunStart | null> {
  return json<RunStart>(await apiFetch("/api/games/spru-run/plays", { method: "POST", body: JSON.stringify({ ceiling }) }));
}

export async function abandonRealRun(playId: number): Promise<RunSummary | null> {
  return json<RunSummary>(await apiFetch(`/api/games/spru-run/plays/${playId}/abandon`, { method: "POST" }));
}

export async function finishRealRun(playId: number, distanceM: number, seedValue: number): Promise<RunFinish | null> {
  return json<RunFinish>(await apiFetch(`/api/games/spru-run/plays/${playId}/finish`, { method: "POST", body: JSON.stringify({ distance_m: distanceM, seed_value: seedValue }) }));
}
