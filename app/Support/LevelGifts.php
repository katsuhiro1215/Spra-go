<?php

namespace App\Support;

use App\Models\ProfileWorldItem;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Collection;

/** 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4) */
class LevelGifts
{
    /** @return list<int> 今のレベルまでに届いた回 */
    public static function levels(int $level): array
    {
        $gifts = config('world.gifts');
        $levels = [];
        for ($l = $gifts['first']; $l <= $level; $l += $gifts['step']) {
            $levels[] = $l;
        }

        return $levels;
    }

    /** @return list<int> 届いたが、まだ選んでいない回 */
    public static function pending(UserProfile $profile): array
    {
        $chosen = $profile->gifts()->pluck('level')->all();

        return array_values(array_diff(self::levels($profile->level), $chosen));
    }

    public static function maxFootprint(int $giftLevel): int
    {
        $gifts = config('world.gifts');

        return $gifts['footprints'][$giftLevel] ?? $gifts['max_footprint'];
    }

    /** @return Collection<int, ShopItem> */
    public static function candidates(int $giftLevel): Collection
    {
        $max = self::maxFootprint($giftLevel);

        return ShopItem::query()->where('type', 'decoration')->orderBy('id')->get()
            ->filter(fn (ShopItem $item) => $item->category() === 'landmark' && $item->footprint() <= $max)
            ->values();
    }

    /** 呼び出し側で、プロフィールをロックしてから呼ぶ */
    public static function choose(UserProfile $profile, int $giftLevel, int $shopItemId): ProfileWorldItem
    {
        abort_unless(in_array($giftLevel, self::levels($profile->level), true), 422, 'まだ選べないよ');
        abort_if($profile->gifts()->where('level', $giftLevel)->exists(), 422, 'もう選んだよ');
        $item = self::candidates($giftLevel)->firstWhere('id', $shopItemId);
        abort_if($item === null, 422, 'この中から選んでね');

        $profile->gifts()->create(['level' => $giftLevel, 'shop_item_id' => $item->id]);

        return $profile->worldItems()->create(['shop_item_id' => $item->id])->load('shopItem');
    }
}
