// GET /api/coin-packages の答え({ enabled, packages })を、画面に出すパッケージの一覧にする
// (docs/design/2026-10-03-closed-beta-design.md 4章)。購入がOFFのときは空にして、購入の欄を出さない

export type CoinPackageInfo = { key: string; coins: number; amount: number; currency: string; label: string };

export function coinPackagesFrom(data: unknown): CoinPackageInfo[] {
  if (!data || typeof data !== "object") return [];
  const { enabled, packages } = data as { enabled?: unknown; packages?: unknown };
  return enabled === true && Array.isArray(packages) ? (packages as CoinPackageInfo[]) : [];
}
