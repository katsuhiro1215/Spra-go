<?php

namespace App\Support\Deer;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Owner ダッシュボードの、Spraと鹿。の中の遊ばれ方の集計(全体の数だけ。個人の記録は出さない) */
class DeerDashboard
{
    public static function summary(): array
    {
        $today = Carbon::now('Asia/Tokyo')->startOfDay();
        $stats = DeerStats::summary();

        return [
            'profile_count' => DB::table('deer_stage_records')->distinct()->count('user_profile_id'),
            // 今日をふくむ7日(Tane のダッシュボードと同じ数え方)
            'active_profiles_last_7_days' => DB::table('deer_plays')
                ->whereNotNull('user_profile_id')
                ->where('played_on', '>=', $today->copy()->subDays(6)->toDateString())
                ->distinct()->count('user_profile_id'),
            'anon_players_last_7_days' => DB::table('deer_plays')
                ->whereNull('user_profile_id')
                ->where('played_on', '>=', $today->copy()->subDays(6)->toDateString())
                ->distinct()->count('anon_id'),
            'first_play_rate' => self::firstPlayRate(),
            'public_ranking_families' => DB::table('user_schemas')->where('deer_ranking_public', true)->count(),
            'total_plays' => $stats['plays'],
            'total_players' => $stats['players'],
            'worlds' => self::worlds(),
            // 面(1-1・1-2…)ごとの内訳。あまり遊ばれていない面を見つけるのに使う(/api/deer/stats と同じ数)
            'levels' => $stats['levels'],
        ];
    }

    /** Spraと鹿。を使い始めた家族アカウントのうち、1回でも遊んだ(面の記録がある)割合 */
    private static function firstPlayRate(): array
    {
        $accounts = DB::table('user_apps')->where('app', 'deer')->count();
        $played = DB::table('user_apps')
            ->where('user_apps.app', 'deer')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('user_schemas')
                    ->join('user_profiles', 'user_profiles.user_schema_id', '=', 'user_schemas.id')
                    ->whereColumn('user_schemas.user_id', 'user_apps.user_id')
                    ->whereExists(fn ($s) => $s->select(DB::raw(1))->from('deer_stage_records')->whereColumn('deer_stage_records.user_profile_id', 'user_profiles.id'));
            })->count();

        return ['accounts' => $accounts, 'played' => $played, 'rate' => $accounts === 0 ? null : round($played / $accounts, 2)];
    }

    /** ワールド(1〜8)ごとの、遊ばれた回数・遊んだ人数・クリア数(ログインなしもふくむ) */
    private static function worlds(): array
    {
        $rows = DB::table('deer_plays')
            ->selectRaw("substring_index(level_id, '-', 1) as world")
            ->selectRaw('count(*) as plays')
            ->selectRaw('count(distinct player_key) as players')
            ->selectRaw("sum(case when result = 'clear' then 1 else 0 end) as clears")
            ->groupBy('world')
            ->get()
            ->keyBy('world');

        return collect(range(1, 8))->map(function (int $world) use ($rows) {
            $r = $rows[(string) $world] ?? null;

            return [
                'world' => $world,
                'plays' => (int) ($r->plays ?? 0),
                'players' => (int) ($r->players ?? 0),
                'clears' => (int) ($r->clears ?? 0),
            ];
        })->all();
    }
}
