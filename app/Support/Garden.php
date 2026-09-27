<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\ProfileSeed;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * スプルの育ち具合と、畑・仲間(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章)。
 * 育ち具合は保存せず、レベルと「前に種をまいたときのレベル」の差から決める。
 */
class Garden
{
    /** 水やりの「今日」の切り替え(連続日数と同じく日本時間0時) */
    public const TIMEZONE = 'Asia/Tokyo';

    public static function today(): string
    {
        return Carbon::now(self::TIMEZONE)->toDateString();
    }

    /** @return array{x: int, y: int} */
    public static function position(): array
    {
        $garden = collect(WorldLand::landmarks())->firstWhere('key', 'garden');

        return ['x' => $garden['x'], 'y' => $garden['y']];
    }

    public static function growth(UserProfile $profile): int
    {
        return max(0, min($profile->level - $profile->bloom_base_level, config('companions.growth_steps')));
    }

    public static function activeSeed(UserProfile $profile): ?ProfileSeed
    {
        return $profile->seeds()->whereNull('bloomed_at')->first();
    }

    public static function learnedToday(UserProfile $profile): bool
    {
        return $profile->last_correct_on?->toDateString() === self::today();
    }

    /** @return array{x:int, y:int, state:string, waterings:int, learned_today:bool, watered_today:bool, can_sow:bool, can_water:bool} */
    public static function state(UserProfile $profile): array
    {
        $seed = self::activeSeed($profile);
        $learned = self::learnedToday($profile);
        $watered = $seed?->last_watered_on?->toDateString() === self::today();

        return [
            ...self::position(),
            'state' => $seed === null ? 'empty' : ['seed', 'sprout', 'sprout_big'][min($seed->waterings, 2)],
            'waterings' => $seed?->waterings ?? 0,
            'learned_today' => $learned,
            'watered_today' => $watered,
            'can_sow' => $seed === null && self::growth($profile) >= config('companions.growth_steps'),
            'can_water' => $seed !== null && $learned && ! $watered,
        ];
    }

    /** @return list<array{key:string, name:string, trait:string, line:string, x:?int, y:?int}> 生まれた順 */
    public static function companions(UserProfile $profile): array
    {
        $spots = config('world.companion_spots');

        return $profile->companions()->orderBy('id')->get()->values()
            ->map(fn (ProfileCompanion $companion, int $i) => self::companionArray($companion->companion_key, $spots[$i] ?? null))
            ->all();
    }

    /** @param  array{0: int, 1: int}|null  $spot */
    private static function companionArray(string $key, ?array $spot): array
    {
        $def = config("companions.list.{$key}", []);

        return [
            'key' => $key,
            'name' => $def['name'] ?? $key,
            'trait' => $def['trait'] ?? '',
            'line' => $def['line'] ?? '',
            'x' => $spot[0] ?? null,
            'y' => $spot[1] ?? null,
        ];
    }
}
