<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 旅(docs/design/2026-09-28-travel-tickets-design.md 3章・4-2。おみやげは docs/design/2026-09-27-spru-wave-f-design.md 3-2)。
 * はじまりの国(日本)から、クイズで手に入れたチケットで好きな国へ行く。行き先・乗り物・おみやげは config/travel.php に持ち、
 * DBには着いた国(profile_trips)と受け取ったおみやげ(profile_souvenirs)だけを持つ。
 * チケットは表を作らず、クリアの記録(profile_stage_progress)と着いた国から毎回数える(A案)。
 */
class Travel
{
    /** @return list<array<string, mixed>> */
    public static function destinations(): array
    {
        return config('travel.destinations');
    }

    public static function indexOf(string $key): ?int
    {
        $index = array_search($key, array_column(self::destinations(), 'key'), true);

        return $index === false ? null : $index;
    }

    /** 学ぶタブに出す国の国コード(小文字)。日本が先頭、そのあと行き先の順 @return list<string> */
    public static function countryCodes(): array
    {
        return [
            strtolower(config('travel.home.country_code')),
            ...array_map(fn (array $destination) => strtolower($destination['country_code']), self::destinations()),
        ];
    }

    /** 鍵の国(旅の行き先のうち、まだ着いていない国)の国のid。プロフィールがなければ行き先ぜんぶ @return list<int> */
    public static function lockedCountryIds(?UserProfile $profile): array
    {
        $countries = self::countryIdsByCode();
        $visited = $profile ? self::visitedKeys($profile) : [];

        return collect(self::destinations())
            ->reject(fn (array $destination) => in_array($destination['key'], $visited, true))
            ->map(fn (array $destination) => $countries[strtolower($destination['country_code'])] ?? null)
            ->filter()
            ->values()
            ->all();
    }

    /** 鍵の国なら 403。国のないステージ(国のid が null)には鍵をかけない */
    public static function abortIfLocked(?UserProfile $profile, ?int $countryId): void
    {
        abort_if(
            $countryId !== null && in_array($countryId, self::lockedCountryIds($profile), true),
            403,
            'まだこの国に着いていません。',
        );
    }

    /** もらったチケットの数(0で止めない)。「このクリアで新しく増えたか」の判定に使う */
    public static function earnedTickets(UserProfile $profile): int
    {
        return self::context($profile)['earned'];
    }

    /** 持っているチケットの数(3-2)。まだの国が残っていなければ 0 */
    public static function tickets(UserProfile $profile): int
    {
        return self::context($profile)['tickets'];
    }

    /** せかいの画面に出すもの(GET /api/travel)。記録は1回だけ読む @return array{tickets: int, ticket_hint: ?string, destinations: list<array<string, mixed>>} */
    public static function overview(UserProfile $profile): array
    {
        $context = self::context($profile);

        return [
            'tickets' => $context['tickets'],
            'ticket_hint' => self::ticketHint($context),
            'destinations' => array_map(fn (array $destination) => self::present($destination, $context), self::destinations()),
        ];
    }

    /** 町の道に選べる道のキー: 日本('jp')と、旅の行き先のキー(docs/design/2026-10-05-road-style-design.md) */
    public static function roadKeys(): array
    {
        return ['jp', ...array_column(self::destinations(), 'key')];
    }

    /** その国(行き先のキー)に着いているか */
    public static function hasVisited(UserProfile $profile, string $key): bool
    {
        return in_array($key, self::visitedKeys($profile), true);
    }

    /** 選んでいる道。日本か、着いた国のキー。保存してあっても、その国に着いていなければ日本 */
    public static function roadStyle(UserProfile $profile): string
    {
        $style = $profile->road_style;
        if ($style === null || $style === 'jp') {
            return 'jp';
        }

        return self::hasVisited($profile, $style) ? $style : 'jp';
    }

    /** @return list<array<string, mixed>> */
    public static function state(UserProfile $profile): array
    {
        return self::overview($profile)['destinations'];
    }

    /** @return array<string, mixed>|null */
    public static function show(UserProfile $profile, string $key): ?array
    {
        $index = self::indexOf($key);

        return $index === null ? null : self::state($profile)[$index];
    }

    /** 出発する(プロフィールはロック済みで呼ぶ)。着いた国ならチケットを使わない @return array{first: bool, destination: array<string, mixed>} */
    public static function depart(UserProfile $profile, string $key): array
    {
        $index = self::indexOf($key);
        abort_if($index === null, 404);

        if (in_array($key, self::visitedKeys($profile), true)) {
            return ['first' => false, 'destination' => self::state($profile)[$index]];
        }
        abort_unless(self::tickets($profile) > 0, 422, 'チケットがありません。');

        $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);

        return ['first' => true, 'destination' => self::state($profile)[$index]];
    }

    /** おみやげを受け取ってバッグに入れる(プロフィールはロック済みで呼ぶ) @return array{world_item: array<string, mixed>, destination: array<string, mixed>} */
    public static function receive(UserProfile $profile, string $key, string $souvenirKey): array
    {
        $index = self::indexOf($key);
        abort_if($index === null, 404);
        $config = self::destinations()[$index];
        $souvenirConfig = collect($config['souvenirs'])->firstWhere('key', $souvenirKey);
        abort_if($souvenirConfig === null, 404);

        $destination = self::state($profile)[$index];
        abort_unless($destination['state'] === 'visited', 422, 'まだこの国に着いていません。');
        $souvenir = collect($destination['souvenirs'])->firstWhere('key', $souvenirKey);
        abort_unless($souvenir['met'], 422, 'まだ受け取れません。');
        abort_if($souvenir['received'], 422, 'もう受け取っています。');

        $profile->souvenirs()->create(['souvenir' => $souvenirKey, 'received_at' => now()]);
        $worldItem = $profile->worldItems()->create(['shop_item_id' => self::souvenirShopItem($config, $souvenirConfig)->id]);

        return [
            'world_item' => $worldItem->load('shopItem')->toWorldArray(),
            'destination' => self::state($profile)[$index],
        ];
    }

    /** パスポートの「旅した国」。着いた順 @return list<array{key: string, name: string, flag: string, transport: string, arrived_at: string|null}> */
    public static function trips(UserProfile $profile): array
    {
        $destinations = collect(self::destinations())->keyBy('key');

        return $profile->trips()->orderBy('arrived_at')->orderBy('id')->get()
            ->filter(fn ($trip) => $destinations->has($trip->destination))
            ->map(fn ($trip) => [
                'key' => $trip->destination,
                'name' => $destinations[$trip->destination]['name'],
                'flag' => "/flag/{$destinations[$trip->destination]['flag']}.svg",
                'transport' => $destinations[$trip->destination]['transport'],
                'arrived_at' => $trip->arrived_at?->toDateString(),
            ])
            ->values()
            ->all();
    }

    /**
     * 今のデータの記録(設計書3-7。マイグレーションから呼ぶ)。ステージをクリアしている行き先の国を、
     * その国で最初にクリアした日に着いた国として足す。もう着いている国は変えない
     */
    public static function recordTripsForClearedCountries(): void
    {
        $countries = self::countryIdsByCode();

        foreach (self::destinations() as $destination) {
            $countryId = $countries[strtolower($destination['country_code'])] ?? null;
            if ($countryId === null) {
                continue;
            }

            $firstClears = ProfileStageProgress::query()
                ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
                ->where('stages.country_id', $countryId)
                ->whereNotNull('profile_stage_progress.cleared_at')
                ->groupBy('profile_stage_progress.user_profile_id')
                ->selectRaw('profile_stage_progress.user_profile_id as profile_id, MIN(profile_stage_progress.cleared_at) as first_cleared_at')
                ->get();

            foreach ($firstClears as $row) {
                UserProfile::query()->find($row->profile_id)?->trips()->firstOrCreate(
                    ['destination' => $destination['key']],
                    ['arrived_at' => $row->first_cleared_at],
                );
            }
        }
    }

    /** おみやげの町のアイテム(非売品)。そのおみやげを初めてだれかが受け取ったときに作る(スプルの花と同じ) */
    private static function souvenirShopItem(array $destination, array $souvenir): ShopItem
    {
        return ShopItem::query()->firstOrCreate(
            ['type' => 'decoration', 'name' => $souvenir['name']],
            [
                'price' => 0,
                'currency' => 'point',
                'min_level' => 1,
                'meta' => ['asset_key' => $souvenir['key'], 'not_for_sale' => true, 'souvenir_of' => $destination['name']],
            ],
        );
    }

    /** @return list<string> */
    private static function visitedKeys(UserProfile $profile): array
    {
        return $profile->trips()->pluck('destination')->all();
    }

    /** 日本と行き先の国の、国コード(小文字) => 国のid。DBにない国は入らない @return array<string, int> */
    private static function countryIdsByCode(): array
    {
        return Country::query()
            ->whereIn(DB::raw('LOWER(code)'), self::countryCodes())
            ->get(['id', 'code'])
            ->mapWithKeys(fn (Country $country) => [strtolower($country->code) => (int) $country->id])
            ->all();
    }

    /** 学べる国(日本と着いた国)。日本が先、そのあと行き先の順 @return list<array{name: string, country_id: int|null}> */
    private static function learnablePlaces(array $countries, array $visited): array
    {
        $places = [config('travel.home'), ...array_filter(
            self::destinations(),
            fn (array $destination) => in_array($destination['key'], $visited, true),
        )];

        return array_values(array_map(fn (array $place) => [
            'name' => $place['name'],
            'country_id' => $countries[strtolower($place['country_code'])] ?? null,
        ], $places));
    }

    /** 状態の計算に使う記録。それぞれ1回のクエリで読む @return array<string, mixed> */
    private static function context(UserProfile $profile): array
    {
        $cleared = ProfileStageProgress::query()
            ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
            ->where('profile_stage_progress.user_profile_id', $profile->id)
            ->whereNotNull('profile_stage_progress.cleared_at')
            ->get(['stages.country_id', 'stages.category_id', 'stages.difficulty', 'stages.is_boss']);
        // チケットは、国のメインの道(ルート「国旗」の下の国のカテゴリー)の初級のボスだけが数える。英語・世界遺産のボスでは増えない
        $mainCategoryIds = Category::query()
            ->whereIn('parent_id', Category::query()->where('name', config('courses.country_root'))->whereNull('parent_id')->select('id'))
            ->pluck('id')->map(fn ($id) => (int) $id)->all();
        $countries = self::countryIdsByCode();
        $visited = self::visitedKeys($profile);
        $bossCountries = $cleared
            ->filter(fn ($stage) => $stage->difficulty === '初級' && (bool) $stage->is_boss && $stage->country_id !== null && in_array((int) $stage->category_id, $mainCategoryIds, true))
            ->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $learnable = self::learnablePlaces($countries, $visited);
        $earned = collect($learnable)->filter(fn (array $place) => in_array($place['country_id'], $bossCountries, true))->count();
        $remaining = count(array_diff(array_column(self::destinations(), 'key'), $visited));

        return [
            'visited' => $visited,
            'received' => $profile->souvenirs()->pluck('souvenir')->all(),
            'cleared_countries' => $cleared->pluck('country_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'boss_countries' => $bossCountries,
            'countries' => $countries,
            'learnable' => $learnable,
            'earned' => $earned,
            'tickets' => $remaining === 0 ? 0 : max(0, $earned - count($visited)),
        ];
    }

    /** 学べる国のうち、初級のボスをまだ倒していない最初の国の名前(DBにない国は飛ばす) */
    private static function ticketHint(array $context): ?string
    {
        foreach ($context['learnable'] as $place) {
            if ($place['country_id'] !== null && ! in_array($place['country_id'], $context['boss_countries'], true)) {
                return $place['name'];
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    private static function present(array $destination, array $context): array
    {
        $countryId = $context['countries'][strtolower($destination['country_code'])] ?? null;
        $visited = in_array($destination['key'], $context['visited'], true);
        $souvenirs = $visited
            ? array_map(fn (array $souvenir) => self::souvenir($destination, $souvenir, $countryId, $context), $destination['souvenirs'])
            : [];

        return [
            'key' => $destination['key'],
            'name' => $destination['name'],
            'country_id' => $countryId,
            'code' => $destination['country_code'],
            'flag' => "/flag/{$destination['flag']}.svg",
            'transport' => $destination['transport'],
            'state' => $visited ? 'visited' : 'unvisited',
            'can_depart' => ! $visited && $context['tickets'] > 0,
            'souvenirs' => $souvenirs,
            'souvenir_count' => count($destination['souvenirs']),
            'gift_ready' => collect($souvenirs)->contains(fn (array $souvenir) => $souvenir['met'] && ! $souvenir['received']),
            'greeting' => $destination['greeting'],
        ];
    }

    /** @return array<string, mixed> */
    private static function souvenir(array $destination, array $souvenir, ?int $countryId, array $context): array
    {
        $boss = $souvenir['condition'] === 'boss';
        $cleared = $boss ? $context['boss_countries'] : $context['cleared_countries'];

        return [
            'key' => $souvenir['key'],
            'name' => $souvenir['name'],
            'asset_key' => $souvenir['key'],
            'footprint' => (int) (config('world.asset_footprints')[$souvenir['key']] ?? 1),
            'condition' => $souvenir['condition'],
            'condition_label' => $boss
                ? "{$destination['name']}の初級のボスをクリア"
                : "{$destination['name']}のステージを1つクリア",
            'met' => $countryId !== null && in_array($countryId, $cleared, true),
            'received' => in_array($souvenir['key'], $context['received'], true),
        ];
    }
}
