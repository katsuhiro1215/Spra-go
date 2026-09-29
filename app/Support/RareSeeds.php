<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * がんばった記念にもらう特別な種(docs/design/2026-09-29-rare-spru-design.md 3-1・3-2・4-3)。
 * 条件の数は保存せず、今ある記録から数える(今日の復習をやりきった回数だけは user_profiles.reviews_completed)
 */
class RareSeeds
{
    /** @return array<string, array<string, mixed>> 設定(config/companions.php の list)の順のレアスプル */
    public static function rares(): array
    {
        return collect(config('companions.list'))->filter(fn (array $def) => $def['rare'] ?? false)->all();
    }

    public static function isRare(string $key): bool
    {
        return (bool) config("companions.list.{$key}.rare", false);
    }

    /**
     * 10色それぞれの進み具合。current は目標で止める(一覧の棒があふれないように)
     *
     * @return list<array{key: string, type: string, target: int, current: int, met: bool}>
     */
    public static function progress(UserProfile $profile): array
    {
        $counts = [];
        $rows = [];
        foreach (self::rares() as $key => $def) {
            ['type' => $type, 'target' => $target] = $def['condition'];
            $counts[$type] ??= self::count($profile, $type);
            $met = $counts[$type]['reached'] >= $target;
            $rows[] = [
                'key' => $key,
                'type' => $type,
                'target' => $target,
                'current' => $met ? $target : min($counts[$type]['current'], $target),
                'met' => $met,
            ];
        }

        return $rows;
    }

    /**
     * 満たしていて、まだもらっていない色の種を渡す。呼び出し側で、プロフィールを lockForUpdate してから呼ぶ
     *
     * @return list<string> 新しく渡した色(一覧の順)
     */
    public static function grant(UserProfile $profile): array
    {
        $have = $profile->specialSeeds()->pluck('rare_key')->all();
        $granted = [];
        foreach (self::progress($profile) as $row) {
            if ($row['met'] && ! in_array($row['key'], $have, true)) {
                $profile->specialSeeds()->create(['rare_key' => $row['key'], 'granted_at' => now()]);
                $granted[] = $row['key'];
            }
        }

        return $granted;
    }

    /**
     * GET の API から呼ぶ。プロフィールをロックして渡す(2つのタブで同時に開いても2回渡らない)
     *
     * @return list<string>
     */
    public static function grantLocked(UserProfile $profile): array
    {
        return DB::transaction(
            fn () => self::grant(UserProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail()),
        );
    }

    /** @return list<array{key: string, name: string}> 種のふくろの中(まだまいていない種。一覧の順) */
    public static function bag(UserProfile $profile): array
    {
        $inBag = $profile->specialSeeds()->whereNull('planted_at')->pluck('rare_key')->all();

        return collect(self::rares())
            ->filter(fn (array $def, string $key) => in_array($key, $inBag, true))
            ->map(fn (array $def, string $key) => ['key' => $key, 'name' => $def['name']])
            ->values()
            ->all();
    }

    /**
     * 種をもらったお祝い(設計書5-2)に渡す形
     *
     * @param  list<string>  $keys
     * @return list<array{key: string, name: string, reason: string}>
     */
    public static function present(array $keys): array
    {
        return array_map(function (string $key) {
            $def = config("companions.list.{$key}");

            return [
                'key' => $key,
                'name' => $def['name'],
                'reason' => self::text($def['condition']['type'], $def['condition']['target'], 'reached'),
            ];
        }, $keys);
    }

    /** 条件の文。$which は goal(一覧)か reached(お祝い) */
    public static function text(string $type, int $target, string $which): string
    {
        $texts = config("companions.condition_texts.{$type}");
        $template = $target === 1 && isset($texts["{$which}_one"]) ? $texts["{$which}_one"] : $texts[$which];

        return str_replace('{n}', (string) $target, $template);
    }

    /** @return array{text: string, current: int, target: int, unit: string} なかまの一覧の条件 */
    public static function condition(string $key, int $current): array
    {
        ['type' => $type, 'target' => $target] = config("companions.list.{$key}.condition");

        return [
            'text' => self::text($type, $target, 'goal'),
            'current' => $current,
            'target' => $target,
            'unit' => config("companions.condition_texts.{$type}.unit"),
        ];
    }

    /** @return array{reached: int, current: int} reached は満たしたかどうかに使う数、current は一覧に出す数 */
    private static function count(UserProfile $profile, string $type): array
    {
        if ($type === 'streak') {
            return ['reached' => (int) $profile->best_streak, 'current' => self::currentStreak($profile)];
        }

        $count = match ($type) {
            'trips' => $profile->trips()->count(),
            'level' => (int) $profile->level,
            'reviews' => (int) $profile->reviews_completed,
            'advanced_stages' => DB::table('profile_stage_progress')
                ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
                ->where('profile_stage_progress.user_profile_id', $profile->id)
                ->whereNotNull('profile_stage_progress.cleared_at')
                ->where('stages.difficulty', '上級')
                ->distinct()
                ->count('profile_stage_progress.stage_id'),
            'catch_perfect' => $profile->gamePlays()
                ->where('game', CatchGame::GAME)
                ->whereNotNull('finished_at')
                ->whereColumn('correct_count', 'answered_count')
                ->get(['question_ids', 'answered_count'])
                ->filter(fn ($play) => $play->answered_count > 0 && $play->answered_count === count($play->question_ids))
                ->count(),
            'companions' => $profile->companions()->pluck('companion_key')->reject(fn (string $key) => self::isRare($key))->count(),
        };

        return ['reached' => $count, 'current' => $count];
    }

    /** 今の連続。昨日も今日も学んでいなければ0(連続日数の日の切り替えと同じく日本時間) */
    private static function currentStreak(UserProfile $profile): int
    {
        $today = Garden::today();
        $yesterday = Carbon::parse($today, Garden::TIMEZONE)->subDay()->toDateString();

        return in_array($profile->last_played_date?->toDateString(), [$today, $yesterday], true)
            ? (int) $profile->current_streak
            : 0;
    }
}
