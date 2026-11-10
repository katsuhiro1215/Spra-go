<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * スイムコイン交換所(docs/design/2026-11-10-spru-swim-design.md、2026-10-17-spru-costumes-design.md 10章)。
 * スイムコインだけで、きせかえを買う。ワードローブ(所有・着用)は、タネ交換所(RunSeedShop)とまったく同じものを共有する
 * ― 衣装はアカウントに1着だけ着る仕組みなので、通貨(どちらで買ったか)が違うだけで、あとの扱いは共通
 */
class SwimCoinShop
{
    public const CURRENCY = 'swim_coin';

    public static function list(UserProfile $profile): array
    {
        $profile = $profile->fresh();
        $owned = $profile->costumes()->pluck('costume_key')->all();

        $costumes = collect(RunSeedShop::costumes())
            ->filter(fn (array $c) => ($c['currency'] ?? 'run_seed') === self::CURRENCY)
            ->filter(fn (array $c) => in_array($c['key'], $owned, true) || RunSeedShop::costumeInSeason($c))
            ->map(fn (array $c) => [
                'key' => $c['key'],
                'name' => $c['name'],
                'price' => $c['price'],
                'owned' => in_array($c['key'], $owned, true),
                'equipped' => $profile->costume_key === $c['key'],
                'affordable' => $profile->swim_coins >= $c['price'],
            ])->values();

        return ['coins' => (int) $profile->swim_coins, 'costumes' => $costumes, 'costume_key' => $profile->costume_key];
    }

    /** きせかえを買う。スイムコインの商品でなければ404(ランのタネの商品はこの道では買えない) */
    public static function buyCostume(UserProfile $profile, string $key): array
    {
        $costume = RunSeedShop::costumes()[$key] ?? null;
        abort_if($costume === null || ($costume['currency'] ?? 'run_seed') !== self::CURRENCY, 404);

        $result = RunSeedShop::buyCostume($profile, $key);

        return ['coins' => $result['coins'], 'costume_key' => $result['costume_key']];
    }
}
