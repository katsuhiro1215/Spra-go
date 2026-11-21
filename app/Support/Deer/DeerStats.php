<?php

namespace App\Support\Deer;

use App\Models\DeerPlay;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Spraと鹿。の、面ごとの遊ばれた数(だれでも見られる)。数だけで、だれが遊んだかは出さない。
 * plays=遊ばれた回数、players=遊んだ人数、clears=クリアした回数、clear_players=クリアした人数。
 * ログインしていない人も、端末ごとの番号で1人と数える
 */
class DeerStats
{
    public static function summary(): array
    {
        return Cache::remember('deer-stats', config('deer.stats_cache_seconds'), fn () => self::compute());
    }

    public static function compute(): array
    {
        $rows = DeerPlay::query()
            ->select('level_id')
            ->selectRaw('COUNT(*) as plays')
            ->selectRaw('COUNT(DISTINCT player_key) as players')
            ->selectRaw("SUM(CASE WHEN result = 'clear' THEN 1 ELSE 0 END) as clears")
            ->selectRaw("COUNT(DISTINCT CASE WHEN result = 'clear' THEN player_key END) as clear_players")
            ->groupBy('level_id')
            ->get()
            ->keyBy('level_id');

        $levels = [];
        foreach (DeerLevels::all() as $id) {
            $r = $rows[$id] ?? null;
            $levels[] = [
                'level' => $id,
                'plays' => (int) ($r->plays ?? 0),
                'players' => (int) ($r->players ?? 0),
                'clears' => (int) ($r->clears ?? 0),
                'clear_players' => (int) ($r->clear_players ?? 0),
            ];
        }

        return [
            'players' => (int) DB::table('deer_plays')->distinct()->count('player_key'),
            'plays' => (int) DeerPlay::query()->count(),
            'levels' => $levels,
            'updated_at' => now()->toAtomString(),
        ];
    }
}
