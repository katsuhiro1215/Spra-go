import { apiFetch } from "@/lib/api";

/** GET /api/games/spru-swim(と、始める・やめる・終えるの答えに入る入口の情報)。docs/design/2026-11-10-spru-swim-design.md */
export type SwimSummary = {
  best_score: number | null;
  real_plays_left: number;
  real_plays_per_day: number;
  coins: number;
  bonus_available: boolean;
  bonus: number;
  limited: boolean;
  ends_on: string | null;
  days_left: number | null;
};

export type SwimStart = SwimSummary & { play_id: number; seed: number; ceiling: number };
export type SwimFinish = SwimSummary & { score: number; distance_m: number; coin_value: number; coins_earned: number; bonus: number; rank: number | null };

async function json<T>(response: Response): Promise<T | null> {
  return response.ok ? ((await response.json()) as T) : null;
}

export async function fetchSwimSummary(): Promise<SwimSummary | null> {
  return json<SwimSummary>(await apiFetch("/api/games/spru-swim"));
}

export async function startRealSwim(ceiling: number): Promise<SwimStart | null> {
  return json<SwimStart>(await apiFetch("/api/games/spru-swim/plays", { method: "POST", body: JSON.stringify({ ceiling }) }));
}

export async function abandonRealSwim(playId: number): Promise<SwimSummary | null> {
  return json<SwimSummary>(await apiFetch(`/api/games/spru-swim/plays/${playId}/abandon`, { method: "POST" }));
}

export async function finishRealSwim(playId: number, distanceM: number, coinValue: number): Promise<SwimFinish | null> {
  return json<SwimFinish>(await apiFetch(`/api/games/spru-swim/plays/${playId}/finish`, { method: "POST", body: JSON.stringify({ distance_m: distanceM, coin_value: coinValue }) }));
}

/** GET /api/swim-coin-shop(スイムコイン交換所。docs/design/2026-10-17-spru-costumes-design.md 10章) */
export type CostumeRow = { key: string; name: string; price: number; owned: boolean; equipped: boolean; affordable: boolean };
export type SwimCoinShop = { coins: number; costumes: CostumeRow[]; costume_key: string | null };

export async function fetchSwimCoinShop(): Promise<SwimCoinShop | null> {
  return json<SwimCoinShop>(await apiFetch("/api/swim-coin-shop"));
}

export async function buySwimCostume(key: string): Promise<{ coins: number } | null> {
  return json(await apiFetch(`/api/swim-coin-shop/costumes/${key}/buy`, { method: "POST" }));
}

/** 着せ替えは、タネ交換所と共有(アカウントに1着だけ) */
export async function equipCostume(key: string | null): Promise<{ costume_key: string | null } | null> {
  return json(await apiFetch("/api/run-seed-shop/costume", { method: "PUT", body: JSON.stringify({ key }) }));
}
