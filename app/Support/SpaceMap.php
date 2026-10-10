<?php

namespace App\Support;

use App\Models\ProfileGamePlay;
use App\Models\ProfileSpaceStop;
use App\Models\UserProfile;

/**
 * 宇宙ぼうけんマップ(docs/design/2026-10-10-space-adventure-map-design.md)。
 * 星を順にたどる。前の星をクリアすると次が開き、正解の割合で星の評価(1〜3)が決まる
 */
class SpaceMap
{
    /** @return list<array{key: string, name: string, difficulty: string, color: string, note: string}> */
    public static function stops(): array
    {
        return config('space_map.stops');
    }

    /**
     * 地図の状態。current は、いま向かう星(開いていてまだクリアしていない最初の星。全部クリアしたら最後)
     *
     * @return array{stops: list<array<string, mixed>>, current: string}
     */
    public static function state(UserProfile $profile): array
    {
        $stars = $profile->spaceStops()->pluck('stars', 'stop');
        $cleared = $profile->spaceStops()->whereNotNull('cleared_on')->pluck('stop')->all();
        $stops = [];
        $current = null;
        $previousCleared = true; // 最初の星は、最初から開いている

        foreach (self::stops() as $stop) {
            $isCleared = in_array($stop['key'], $cleared, true);
            $open = $previousCleared;
            if ($open && ! $isCleared && $current === null) {
                $current = $stop['key'];
            }
            $stops[] = $stop + ['open' => $open, 'cleared' => $isCleared, 'stars' => (int) ($stars[$stop['key']] ?? 0)];
            $previousCleared = $isCleared;
        }

        return ['stops' => $stops, 'current' => $current ?? array_key_last(array_flip(array_column(self::stops(), 'key')))];
    }

    /** 開いている星の難しさ。知らない星・閉じている星は 422 */
    public static function difficultyFor(UserProfile $profile, string $stop): string
    {
        $found = collect(self::state($profile)['stops'])->firstWhere('key', $stop);
        abort_if($found === null, 422, 'その星は知らないよ。');
        abort_unless($found['open'], 422, 'まだその星には行けないよ。前の星をクリアしてね。');

        return $found['difficulty'];
    }

    /** 正解の割合で、星の評価(0〜3) */
    public static function starsFor(int $correct, int $total): int
    {
        if ($total <= 0) {
            return 0;
        }
        $ratio = $correct / $total;
        $stars = 0;
        foreach (config('space_map.star_ratios') as [$need, $count]) {
            if ($ratio + 1e-9 >= $need) {
                $stars = $count;
            }
        }

        return $stars;
    }

    /**
     * 地図から始めた回の結果を、星の記録に書く。呼ぶ側で、プロフィールをロックしてから呼ぶ。
     * いちばんよい評価だけを残し、はじめてのクリアにはボーナスを出す(そのときだけ)
     *
     * @return array{stop: string, cleared: bool, stars: int, best_stars: int, first_clear: bool, unlocked: ?string, bonus: ?array{xp: int, point: int}, leveled_up: bool}
     */
    public static function record(UserProfile $profile, ProfileGamePlay $play, int $correct, int $total): array
    {
        $stop = $play->stop;
        $cleared = $total > 0 && $correct / $total + 1e-9 >= config('space_map.clear_ratio');
        $stars = $cleared ? self::starsFor($correct, $total) : 0;

        $record = ProfileSpaceStop::query()->firstOrNew(['user_profile_id' => $profile->id, 'stop' => $stop]);
        $firstClear = $cleared && $record->cleared_on === null;
        $record->stars = max((int) $record->stars, $stars);
        if ($firstClear) {
            $record->cleared_on = Garden::today();
        }
        $record->save();

        $bonus = null;
        $leveledUp = false;
        if ($firstClear) {
            $bonus = config('space_map.first_clear_bonus');
            $leveledUp = $profile->applyEconomy($bonus, 'space_map_first_clear')['leveled_up'];
        }

        $keys = array_column(self::stops(), 'key');
        $next = $keys[array_search($stop, $keys, true) + 1] ?? null;

        return [
            'stop' => $stop,
            'cleared' => $cleared,
            'stars' => $stars,
            'best_stars' => $record->stars,
            'first_clear' => $firstClear,
            'unlocked' => $firstClear ? $next : null,
            'bonus' => $bonus,
            'leveled_up' => $leveledUp,
        ];
    }
}
