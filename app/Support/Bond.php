<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\UserProfile;

/**
 * 相棒のなかよし度(docs/design/2026-09-27-spru-wave-c-design.md 3-3・3-4)。
 * ハートの数は保存せず、なかよし度(profile_companions.bond)から決める。
 */
class Bond
{
    public static function hearts(int $bond): int
    {
        return max(1, collect(config('companions.bond_hearts'))->filter(fn (int $need) => $bond >= $need)->count());
    }

    public static function label(int $hearts): string
    {
        return config('companions.heart_labels')[$hearts - 1];
    }

    /** 次のハートに必要ななかよし度。ハート5つなら null */
    public static function nextHeartBond(int $bond): ?int
    {
        return collect(config('companions.bond_hearts'))->first(fn (int $need) => $need > $bond);
    }

    /** @return list<string> ハートの数だけ覚えたひとこと */
    public static function lines(string $key, int $hearts): array
    {
        return array_slice(config("companions.list.{$key}.lines", []), 0, $hearts);
    }

    public static function displayName(ProfileCompanion $companion): string
    {
        return $companion->nickname ?? config("companions.list.{$companion->companion_key}.name", $companion->companion_key);
    }

    public static function partner(UserProfile $profile): ?ProfileCompanion
    {
        if ($profile->partner_companion_key === null) {
            return null;
        }

        return $profile->companions()->where('companion_key', $profile->partner_companion_key)->first();
    }

    /**
     * 相棒になかよし度を足す(0なら足さずに今の様子だけ返す)。相棒がいなければ null。
     *
     * @return array{key: string, name: string, hearts: int, heart_label: string, hearts_up: bool, new_line: ?string}|null
     */
    public static function addToPartner(UserProfile $profile, int $amount): ?array
    {
        $partner = self::partner($profile);
        if ($partner === null) {
            return null;
        }

        $before = self::hearts($partner->bond);
        if ($amount > 0) {
            // 続けて足しても取りこぼさないよう、DBの上で足す
            $partner->increment('bond', $amount);
        }
        $hearts = self::hearts($partner->bond);
        $up = $hearts > $before;

        return [
            'key' => $partner->companion_key,
            'name' => self::displayName($partner),
            'hearts' => $hearts,
            'heart_label' => self::label($hearts),
            'hearts_up' => $up,
            'new_line' => $up ? (self::lines($partner->companion_key, $hearts)[$hearts - 1] ?? null) : null,
        ];
    }
}
