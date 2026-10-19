<?php

namespace App\Support;

use App\Models\ProfileCostume;
use App\Models\ShopItem;
use App\Models\UserProfile;
use App\Models\UserProfileItem;
use Illuminate\Support\Facades\DB;

/**
 * タネ交換所(docs/design/2026-10-22-spru-run-design.md 14-6、2026-10-17-spru-costumes-design.md)。
 * ランのタネだけで買う。コイン・ポイント・経験値は動かない
 */
class RunSeedShop
{
    public const CURRENCY = 'run_seed';

    /** @return array<string, array{key: string, name: string, price: int, season: array{from: string, until: string}}> キーで引く */
    public static function costumes(): array
    {
        return collect(config('costumes.items'))->keyBy('key')->all();
    }

    public static function costumeInSeason(array $costume, ?string $today = null): bool
    {
        return GameRollout::inSeason($costume['season'], substr($today ?? Garden::today(), 5));
    }

    /** いま着ている衣装(キーと名前)。着ていなければ null */
    public static function worn(UserProfile $profile): ?array
    {
        $costume = self::costumes()[$profile->costume_key ?? ''] ?? null;

        return $costume ? ['key' => $costume['key'], 'name' => $costume['name']] : null;
    }

    public static function list(UserProfile $profile): array
    {
        $profile = $profile->fresh();
        $seeds = (int) $profile->run_seeds;
        $owned = $profile->costumes()->pluck('costume_key')->all();

        $items = ShopItem::query()
            ->where('type', 'decoration')->where('currency', self::CURRENCY)
            ->orderBy('price')->get()
            ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
            ->values()
            ->map(fn (ShopItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => $item->price,
                'asset_key' => $item->assetKey(),
                'footprint' => $item->footprint(),
                'category' => $item->category(),
                'affordable' => $seeds >= $item->price,
            ]);

        // 持っている衣装は、季節の外でも並べる(着替えるため)。持っていない衣装は、季節の間だけ並べる
        $costumes = collect(self::costumes())
            ->filter(fn (array $c) => in_array($c['key'], $owned, true) || self::costumeInSeason($c))
            ->map(fn (array $c) => [
                'key' => $c['key'],
                'name' => $c['name'],
                'price' => $c['price'],
                'owned' => in_array($c['key'], $owned, true),
                'equipped' => $profile->costume_key === $c['key'],
                'affordable' => $seeds >= $c['price'],
            ])->values();

        return ['seeds' => $seeds, 'items' => $items, 'costumes' => $costumes, 'costume_key' => $profile->costume_key];
    }

    /** かざりを買う: 財布を引いて、バッグに入れる(1つの取引) */
    public static function buyItem(UserProfile $profile, ShopItem $item): array
    {
        abort_unless($item->type === 'decoration' && $item->currency === self::CURRENCY, 422, 'この商品は、タネでは買えません。');
        abort_if($item->meta['not_for_sale'] ?? false, 422, 'このアイテムは買えません。');

        return DB::transaction(function () use ($profile, $item) {
            $locked = UserProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->run_seeds < $item->price, 422, 'タネが足りません。');
            $locked->applyEconomy(['run_seed' => -$item->price], 'run_seed_shop');

            $worldItem = $locked->worldItems()->create(['shop_item_id' => $item->id]);
            UserProfileItem::create(['user_profile_id' => $locked->id, 'shop_item_id' => $item->id, 'purchased_at' => now()]);

            return ['seeds' => (int) $locked->run_seeds, 'world_item' => $worldItem->load('shopItem')->toWorldArray()];
        });
    }

    /** きせかえを買う: 季節の間だけ。1着ずつ。財布を引いて、衣装を渡す(1つの取引。二重の押しでも2回引かない) */
    public static function buyCostume(UserProfile $profile, string $key): array
    {
        $costume = self::costumes()[$key] ?? null;
        abort_if($costume === null, 404);

        return DB::transaction(function () use ($profile, $costume) {
            $locked = UserProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->costumes()->where('costume_key', $costume['key'])->exists(), 422, 'もう持っています。');
            abort_unless(self::costumeInSeason($costume), 422, 'この季節の衣装ではありません。');
            abort_if($locked->run_seeds < $costume['price'], 422, 'タネが足りません。');
            $locked->applyEconomy(['run_seed' => -$costume['price']], 'run_seed_costume');
            $locked->costumes()->create(['costume_key' => $costume['key'], 'acquired_at' => now()]);

            return ['seeds' => (int) $locked->run_seeds, 'costume_key' => $locked->costume_key];
        });
    }

    /** 着る(key)/ふつうに戻す(null)。持っている衣装だけ */
    public static function equip(UserProfile $profile, ?string $key): array
    {
        abort_if($key !== null && ! $profile->costumes()->where('costume_key', $key)->exists(), 422, 'この衣装は、まだ持っていません。');
        $profile->update(['costume_key' => $key]);

        return ['costume_key' => $key];
    }
}
