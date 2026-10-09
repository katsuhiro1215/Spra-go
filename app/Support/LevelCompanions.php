<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * レベルで会える通常キャラ(docs/design/2026-10-08-town-growth-design.md 4-2)。
 * 届いたかどうかは今のレベルから決める。保存するのは仲間に入ったという記録(profile_companions)だけ
 */
class LevelCompanions
{
    /** 並びの何番目(0始まり)が会えるレベル */
    public static function levelFor(int $index): int
    {
        return config('companions.level_first') + config('companions.level_step') * $index;
    }

    /** @return list<string> 今のレベルまでに届いているキャラ */
    public static function due(UserProfile $profile): array
    {
        $due = [];
        foreach (config('companions.level_order') as $index => $key) {
            if ($profile->level >= self::levelFor($index)) {
                $due[] = $key;
            }
        }

        return $due;
    }

    /**
     * まだ持っていない届いたキャラを入れる。呼び出し側で、プロフィールをロックしてから呼ぶ。
     *
     * @return list<array<string, mixed>> 今回入ったキャラ(Garden::companions の1人分と同じ形)
     */
    public static function grantDue(UserProfile $profile): array
    {
        $have = $profile->companions()->pluck('companion_key')->all();
        $new = array_values(array_diff(self::due($profile), $have));
        if ($new === []) {
            return [];
        }
        foreach ($new as $key) {
            Garden::addCompanion($profile, $key);
        }

        return collect(Garden::companions($profile))
            ->whereIn('key', $new)
            ->sortBy(fn (array $companion) => array_search($companion['key'], $new, true))
            ->values()
            ->all();
    }
}
