<?php

namespace App\Support\Tane;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Owner ダッシュボードの、Tane の中の遊ばれ方の集計(全体の数だけ。個人の記録は出さない) */
class DashboardSummary
{
    /** Tane のあそび(ステージIDの前の部分)。Tane の MODE_IDS と同じ並び */
    public const MODES = ['add', 'sub', 'mul', 'div', 'flash', 'soroban', 'shisoku'];

    public static function summary(): array
    {
        $today = Carbon::now('Asia/Tokyo')->startOfDay();

        return [
            'profile_count' => DB::table('tane_profile_states')->count(),
            // 今日をふくむ7日(保護者の画面の「この1週間」と同じ数え方)
            'active_profiles_last_7_days' => DB::table('tane_play_days')
                ->where('played_on', '>=', $today->copy()->subDays(6)->toDateString())
                ->distinct()->count('user_profile_id'),
            'first_play_rate' => self::firstPlayRate(),
            'modes' => self::modes(),
        ];
    }

    /** Tane を使い始めた家族アカウントのうち、1回でも遊んだ(ステージの記録か、あそんだ日がある)割合。引き継ぎがうまくいっているかの目安 */
    private static function firstPlayRate(): array
    {
        $accounts = DB::table('user_apps')->where('app', 'tane')->count();
        $played = DB::table('user_apps')
            ->where('user_apps.app', 'tane')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('user_schemas')
                    ->join('user_profiles', 'user_profiles.user_schema_id', '=', 'user_schemas.id')
                    ->whereColumn('user_schemas.user_id', 'user_apps.user_id')
                    ->where(function ($q) {
                        $q->whereExists(fn ($s) => $s->select(DB::raw(1))->from('tane_stage_records')->whereColumn('tane_stage_records.user_profile_id', 'user_profiles.id'))
                            ->orWhereExists(fn ($s) => $s->select(DB::raw(1))->from('tane_play_days')->whereColumn('tane_play_days.user_profile_id', 'user_profiles.id'));
                    });
            })->count();

        return ['accounts' => $accounts, 'played' => $played, 'rate' => $accounts === 0 ? null : round($played / $accounts, 2)];
    }

    /** あそびごとの、遊んだ人数・★の合計・1人の最大・1ステージの最大 */
    private static function modes(): array
    {
        $rows = DB::table('tane_stage_records')
            ->selectRaw("substring_index(stage_id, '-', 1) as mode, user_profile_id, sum(stars) as stars, max(stars) as best")
            ->groupBy('mode', 'user_profile_id')
            ->get()
            ->groupBy('mode');

        return array_map(function (string $mode) use ($rows) {
            $of = $rows->get($mode, collect());

            return [
                'mode' => $mode,
                'players' => $of->count(),
                'total_stars' => (int) $of->sum('stars'),
                'max_profile_stars' => (int) $of->max('stars'),
                'max_stage_stars' => (int) $of->max('best'),
            ];
        }, self::MODES);
    }
}
