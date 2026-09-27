<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\ProfileSeed;
use App\Models\ShopItem;
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

    /** まだ生まれていない仲間から「出やすさ」の重みで1人選ぶ。全員生まれていれば spru_flower */
    public static function pickResult(UserProfile $profile): string
    {
        $born = $profile->companions()->pluck('companion_key')->all();
        $candidates = collect(config('companions.list'))
            ->reject(fn (array $def, string $key) => in_array($key, $born, true))
            ->filter(fn (array $def) => ($def['weight'] ?? 0) > 0);

        if ($candidates->isEmpty()) {
            return config('companions.flower_result');
        }

        $roll = random_int(1, $candidates->sum('weight'));
        foreach ($candidates as $key => $def) {
            $roll -= $def['weight'];
            if ($roll <= 0) {
                return $key;
            }
        }

        return $candidates->keys()->last();
    }

    /** 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ */
    public static function sow(UserProfile $profile): ProfileSeed
    {
        abort_if(self::growth($profile) < config('companions.growth_steps'), 422, 'まだ種ができていないよ');
        abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');

        $profile->bloom_base_level = $profile->level;
        $profile->save();

        return $profile->seeds()->create(['result_key' => self::pickResult($profile)]);
    }

    /**
     * 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。
     *
     * @return array<string, mixed>|null 3回目の水やりで生まれたもの
     */
    public static function water(UserProfile $profile): ?array
    {
        $seed = self::activeSeed($profile);
        abort_if($seed === null, 422, '畑に種がないよ');
        abort_unless(self::learnedToday($profile), 422, '今日1問正解したら、水をあげられるよ');
        abort_if($seed->last_watered_on?->toDateString() === self::today(), 422, '今日はもう水をあげたよ。また明日ね');

        $seed->waterings++;
        $seed->last_watered_on = self::today();
        $born = null;
        if ($seed->waterings >= config('companions.waterings_to_bloom')) {
            $seed->bloomed_at = now();
            $born = self::bloom($profile, $seed->result_key);
        }
        $seed->save();

        return $born;
    }

    /** 「スプルの花」(非売品の町のアイテム)。初めて咲いたときに作る */
    public static function flowerShopItem(): ShopItem
    {
        $item = config('companions.flower_item');

        return ShopItem::query()->firstOrCreate(
            ['type' => 'decoration', 'name' => $item['name']],
            [
                'price' => 0,
                'currency' => 'point',
                'min_level' => 1,
                'meta' => ['asset_key' => $item['asset_key'], 'not_for_sale' => true],
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function bloom(UserProfile $profile, string $resultKey): array
    {
        if ($resultKey === config('companions.flower_result')) {
            $worldItem = $profile->worldItems()->create(['shop_item_id' => self::flowerShopItem()->id]);

            return ['kind' => 'item', 'world_item' => $worldItem->load('shopItem')->toWorldArray()];
        }

        $profile->companions()->firstOrCreate(['companion_key' => $resultKey]);
        $index = $profile->companions()->orderBy('id')->pluck('companion_key')->search($resultKey);

        return ['kind' => 'companion', ...self::companionArray($resultKey, config('world.companion_spots')[$index] ?? null)];
    }

    /** @param  array{0: int, 1: int}|null  $spot */
    private static function companionArray(string $key, ?array $spot): array
    {
        $def = config("companions.list.{$key}", []);

        return [
            'key' => $key,
            'name' => $def['name'] ?? $key,
            'trait' => $def['trait'] ?? '',
            'line' => $def['lines'][0] ?? '',
            'x' => $spot[0] ?? null,
            'y' => $spot[1] ?? null,
        ];
    }
}
