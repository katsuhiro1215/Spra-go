<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;

/**
 * パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)。
 * 今日のおつかい3つをそろえた日に、まだ持っていない物から1つ贈る。一覧は config/zukan.php。
 */
class Zukan
{
    /** @return array<string, array{name: string, english: string, kind: string}> */
    public static function items(): array
    {
        return config('zukan.items');
    }

    /**
     * まだ持っていない物から1つ贈って記録する。全部持っていれば null。
     * 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ(同じ日に二重に贈らないため)。
     *
     * @return array{key: string, name: string, english: string, kind: string}|null
     */
    public static function gift(UserProfile $profile): ?array
    {
        // 重なる記録(ほぼ起きない競合)は、別の物で1回だけ選び直す
        foreach ([1, 2] as $_) {
            $left = array_values(array_diff(array_keys(self::items()), $profile->zukan()->pluck('item_key')->all()));
            if ($left === []) {
                return null;
            }

            $key = Arr::random($left);
            try {
                $profile->zukan()->create(['item_key' => $key, 'received_at' => now()]);
            } catch (UniqueConstraintViolationException) {
                continue;
            }

            return ['key' => $key] + self::items()[$key];
        }

        return null;
    }

    /**
     * ずかんの一覧(窓口の返事)。持っていない物の名前・英語・日付は null(もらうまで出さない)。
     *
     * @return array{items: list<array<string, mixed>>, owned_count: int, total: int}
     */
    public static function list(UserProfile $profile): array
    {
        $owned = $profile->zukan()->pluck('received_at', 'item_key');

        $items = [];
        foreach (self::items() as $key => $item) {
            $has = $owned->has($key);
            $items[] = [
                'key' => $key,
                'kind' => $item['kind'],
                'owned' => $has,
                'name' => $has ? $item['name'] : null,
                'english' => $has ? $item['english'] : null,
                'received_at' => $has ? $owned[$key]->toIso8601String() : null,
            ];
        }

        return ['items' => $items, 'owned_count' => $owned->count(), 'total' => count($items)];
    }
}
