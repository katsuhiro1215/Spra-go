<?php

namespace App\Support;

use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 旅(docs/design/2026-09-27-spru-wave-f-design.md 3章・4-3)。行き先・条件・おみやげは config/travel.php に持ち、
 * DBには着いた国(profile_trips)と受け取ったおみやげ(profile_souvenirs)だけを持つ。
 * おみやげの条件は今あるクリアの記録(profile_stage_progress)から数える。
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

    /** 旅じたく(旅のじゅんびに使う町のアイテム)の絵のキー。ショップの「旅じたく」の札に使う @return list<string> */
    public static function gearAssetKeys(): array
    {
        return collect(self::destinations())
            ->flatMap(fn (array $destination) => array_keys($destination['items']))
            ->unique()
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public static function state(UserProfile $profile): array
    {
        $context = self::context($profile);
        $destinations = self::destinations();
        $next = self::nextIndex($context['visited']);

        return collect($destinations)
            ->map(fn (array $destination, int $index) => self::present($destinations, $index, $next, $context))
            ->all();
    }

    /** @return array<string, mixed>|null */
    public static function show(UserProfile $profile, string $key): ?array
    {
        $index = self::indexOf($key);

        return $index === null ? null : self::state($profile)[$index];
    }

    /** まだ着いていない国のうち、いちばん順の早い国(全部着いていれば null) */
    private static function nextIndex(array $visited): ?int
    {
        foreach (self::destinations() as $index => $destination) {
            if (! in_array($destination['key'], $visited, true)) {
                return $index;
            }
        }

        return null;
    }

    /** 状態の計算に使う記録。それぞれ1回のクエリで読む @return array<string, mixed> */
    private static function context(UserProfile $profile): array
    {
        $cleared = ProfileStageProgress::query()
            ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
            ->where('profile_stage_progress.user_profile_id', $profile->id)
            ->whereNotNull('profile_stage_progress.cleared_at')
            ->get(['stages.country_id', 'stages.difficulty', 'stages.is_boss']);

        $codes = array_map('strtolower', array_column(self::destinations(), 'country_code'));
        $decorations = ShopItem::query()->where('type', 'decoration')->get();

        return [
            'level' => $profile->level,
            'visited' => $profile->trips()->pluck('destination')->all(),
            'received' => $profile->souvenirs()->pluck('souvenir')->all(),
            'owned' => $profile->worldItems()->with('shopItem')->get()
                ->map(fn ($item) => $item->shopItem->assetKey())
                ->filter()
                ->unique()
                ->values()
                ->all(),
            'cleared_countries' => $cleared->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'boss_countries' => $cleared
                ->filter(fn ($stage) => $stage->difficulty === '初級' && (bool) $stage->is_boss)
                ->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'countries' => Country::query()
                ->whereIn(DB::raw('LOWER(code)'), $codes)
                ->get(['id', 'code'])
                ->keyBy(fn (Country $country) => strtolower($country->code)),
            // 旅じたくのヒント(「Lv.7でショップに出るよ」)に使う、売っているアイテムの必要レベル
            'shop_levels' => $decorations
                ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
                ->groupBy(fn (ShopItem $item) => $item->assetKey())
                ->map(fn ($items) => $items->min('min_level'))
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private static function present(array $destinations, int $index, ?int $next, array $context): array
    {
        $destination = $destinations[$index];
        $country = $context['countries'][strtolower($destination['country_code'])] ?? null;
        $visited = in_array($destination['key'], $context['visited'], true);
        $state = $visited ? 'visited' : ($index === $next ? 'next' : 'later');
        $checklist = self::checklist($destinations, $index, $context);
        $souvenirs = array_map(
            fn (array $souvenir) => self::souvenir($destination, $souvenir, $country, $context),
            $destination['souvenirs'],
        );

        return [
            'key' => $destination['key'],
            'name' => $destination['name'],
            'country_id' => $country?->id,
            'code' => $destination['country_code'],
            'flag' => "/flag/{$destination['flag']}.svg",
            'min_level' => $destination['min_level'],
            'state' => $state,
            'ready' => $state === 'next' && collect($checklist)->every(fn (array $row) => $row['done']),
            'checklist' => $checklist,
            'souvenirs' => $souvenirs,
            'gift_ready' => $visited && collect($souvenirs)->contains(fn (array $souvenir) => $souvenir['met'] && ! $souvenir['received']),
            'greeting' => $destination['greeting'],
        ];
    }

    /** 旅のじゅんび: レベル → 町のアイテム → 前の国の2個目のおみやげ @return list<array<string, mixed>> */
    private static function checklist(array $destinations, int $index, array $context): array
    {
        $destination = $destinations[$index];
        $levelDone = $context['level'] >= $destination['min_level'];
        $rows = [[
            'kind' => 'level',
            'label' => "レベル{$destination['min_level']}",
            'done' => $levelDone,
            'hint' => $levelDone ? null : 'あと'.($destination['min_level'] - $context['level']).'レベル',
        ]];

        foreach ($destination['items'] as $assetKey => $name) {
            $done = in_array($assetKey, $context['owned'], true);
            $shopLevel = $context['shop_levels'][$assetKey] ?? null;
            $rows[] = [
                'kind' => 'item',
                'label' => $name,
                'done' => $done,
                'hint' => match (true) {
                    $done => null,
                    $shopLevel !== null && $context['level'] < $shopLevel => "Lv.{$shopLevel}でショップに出るよ",
                    default => 'ショップで買えるよ',
                },
            ];
        }

        if ($index > 0) {
            $previous = $destinations[$index - 1];
            $souvenir = collect($previous['souvenirs'])->firstWhere('condition', 'boss');
            $previousCountry = $context['countries'][strtolower($previous['country_code'])] ?? null;
            $done = in_array($souvenir['key'], $context['received'], true);
            $met = $previousCountry !== null && in_array($previousCountry->id, $context['boss_countries'], true);
            $rows[] = [
                'kind' => 'souvenir',
                'label' => "{$previous['name']}のおみやげ「{$souvenir['name']}」",
                'done' => $done,
                'hint' => match (true) {
                    $done => null,
                    $met => "{$previous['name']}のおみやげ屋さんで受け取ろう",
                    default => "{$previous['name']}の初級のボスをクリアしよう",
                },
            ];
        }

        return $rows;
    }

    /** @return array<string, mixed> */
    private static function souvenir(array $destination, array $souvenir, ?Country $country, array $context): array
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
            'met' => $country !== null && in_array($country->id, $cleared, true),
            'received' => in_array($souvenir['key'], $context['received'], true),
        ];
    }
}
