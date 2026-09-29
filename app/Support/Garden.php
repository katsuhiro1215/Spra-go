<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\ProfileSeed;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * スプルの育ち具合と、畑・仲間(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章、C回の相棒は 2026-09-27-spru-wave-c-design.md)。
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

    /** @return array{x:int, y:int, state:string, look:?string, waterings:int, learned_today:bool, watered_today:bool, spru_seed_ready:bool, seed_bag:list<array{key:string, name:string}>, can_sow:bool, can_water:bool} */
    public static function state(UserProfile $profile): array
    {
        $seed = self::activeSeed($profile);
        $learned = self::learnedToday($profile);
        $watered = $seed?->last_watered_on?->toDateString() === self::today();
        $spruSeedReady = self::growth($profile) >= config('companions.growth_steps');
        $bag = RareSeeds::bag($profile);

        return [
            ...self::position(),
            'state' => $seed === null ? 'empty' : ['seed', 'sprout', 'sprout_big'][min($seed->waterings, 2)],
            'look' => $seed === null ? null : self::look($seed),
            'waterings' => $seed?->waterings ?? 0,
            'learned_today' => $learned,
            'watered_today' => $watered,
            'spru_seed_ready' => $spruSeedReady,
            'seed_bag' => $bag,
            'can_sow' => $seed === null && ($spruSeedReady || $bag !== []),
            'can_water' => $seed !== null && $learned && ! $watered,
        ];
    }

    /**
     * 畑の見た目(docs/design/2026-09-29-rare-spru-design.md 3-4)。特別な種はその色、
     * スプルの種は生まれる子にかかわらず spru(誰が生まれるかを画面に送らない)
     */
    public static function look(ProfileSeed $seed): string
    {
        return RareSeeds::isRare($seed->result_key) ? $seed->result_key : 'spru';
    }

    /**
     * 生まれた仲間。相棒を先頭に、ほかは生まれた順(docs/design/2026-09-27-spru-wave-c-design.md 3-1)。
     * 立ち位置(config/world.php の companion_spots)は、町にいる子だけにこの順で前から使う。
     * おうちで休んでいる子は x・y が null(docs/design/2026-09-29-rare-spru-design.md 3-5)
     *
     * @return list<array<string, mixed>>
     */
    public static function companions(UserProfile $profile): array
    {
        $spots = config('world.companion_spots');
        $partnerKey = $profile->partner_companion_key;
        $next = 0;

        return $profile->companions()->orderBy('id')->get()
            ->sortBy(fn (ProfileCompanion $companion) => $companion->companion_key === $partnerKey ? 0 : 1)
            ->values()
            ->map(function (ProfileCompanion $companion) use ($partnerKey, $spots, &$next) {
                $spot = $companion->in_town ? ($spots[$next++] ?? null) : null;

                return self::companionArray($companion, $partnerKey, $spot);
            })
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

    /**
     * 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。$seed は spru(スプルの種)か、
     * ふくろにある特別な種の色(docs/design/2026-09-29-rare-spru-design.md 3-3)。特別な種はスプルの育ち具合を戻さない
     */
    public static function sow(UserProfile $profile, string $seed = 'spru'): ProfileSeed
    {
        if ($seed === 'spru') {
            abort_if(self::growth($profile) < config('companions.growth_steps'), 422, 'まだ種ができていないよ');
            abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');

            $profile->bloom_base_level = $profile->level;
            $profile->save();

            return $profile->seeds()->create(['result_key' => self::pickResult($profile)]);
        }

        abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');
        $special = $profile->specialSeeds()->where('rare_key', $seed)->whereNull('planted_at')->first();
        abort_if($special === null, 422, 'その種は持っていないよ');
        $special->update(['planted_at' => now()]);

        return $profile->seeds()->create(['result_key' => $seed]);
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

        // 町がいっぱいなら、おうちで休む(docs/design/2026-09-29-rare-spru-design.md 3-5)
        $inTown = $profile->companions()->where('in_town', true)->count() < config('companions.town_limit');
        $profile->companions()->firstOrCreate(['companion_key' => $resultKey], ['in_town' => $inTown]);
        if ($profile->partner_companion_key === null) {
            // 最初の仲間は自動で相棒になる(C回、設計書3-1)
            $profile->partner_companion_key = $resultKey;
            $profile->save();
        }

        return ['kind' => 'companion', ...collect(self::companions($profile))->firstWhere('key', $resultKey)];
    }

    /** @param  array{0: int, 1: int}|null  $spot */
    private static function companionArray(ProfileCompanion $companion, ?string $partnerKey, ?array $spot): array
    {
        $key = $companion->companion_key;
        $def = config("companions.list.{$key}", []);
        $hearts = Bond::hearts($companion->bond);

        return [
            'key' => $key,
            'name' => Bond::displayName($companion),
            'official_name' => $def['name'] ?? $key,
            'nickname' => $companion->nickname,
            'trait' => $def['trait'] ?? '',
            'lines' => Bond::lines($key, $hearts),
            'hearts' => $hearts,
            'heart_label' => Bond::label($hearts),
            'bond' => $companion->bond,
            'next_heart_bond' => Bond::nextHeartBond($companion->bond),
            'is_partner' => $key === $partnerKey,
            'rare' => (bool) ($def['rare'] ?? false),
            'in_town' => (bool) $companion->in_town,
            'x' => $spot[0] ?? null,
            'y' => $spot[1] ?? null,
        ];
    }
}
