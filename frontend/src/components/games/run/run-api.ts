import { apiFetch } from "@/lib/api";

/** GET /api/games/spru-run(と、始める・やめる・終えるの答えに入る入口の情報)。docs/design/2026-10-22-spru-run-design.md 14-3 */
export type RunSummary = {
  best_score: number | null;
  real_plays_left: number;
  real_plays_per_day: number;
  seeds: number;
  /** いま着ている衣装のキー(なければ null) */
  costume_key: string | null;
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

/** GET /api/run-seed-shop(タネ交換所。docs/design/2026-10-17-spru-costumes-design.md 5章) */
export type ShopItemRow = { id: number; name: string; price: number; asset_key: string | null; footprint: number; category: string | null; affordable: boolean };
export type CostumeRow = { key: string; name: string; price: number; owned: boolean; equipped: boolean; affordable: boolean };
export type SeedShop = { seeds: number; items: ShopItemRow[]; costumes: CostumeRow[]; costume_key: string | null };

export async function fetchSeedShop(): Promise<SeedShop | null> {
  return json<SeedShop>(await apiFetch("/api/run-seed-shop"));
}

export async function buySeedItem(id: number): Promise<{ seeds: number } | null> {
  return json(await apiFetch(`/api/run-seed-shop/items/${id}/buy`, { method: "POST" }));
}

export async function buyCostume(key: string): Promise<{ seeds: number } | null> {
  return json(await apiFetch(`/api/run-seed-shop/costumes/${key}/buy`, { method: "POST" }));
}

export async function equipCostume(key: string | null): Promise<{ costume_key: string | null } | null> {
  return json(await apiFetch("/api/run-seed-shop/costume", { method: "PUT", body: JSON.stringify({ key }) }));
}
