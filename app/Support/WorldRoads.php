<?php

namespace App\Support;

use App\Models\ProfileRoad;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 自分で引く町の道(docs/design/2026-10-19-town-roads-design.md 3・4章)。
 * 引けるのは、開いた区画の陸のマスで、目印・もとの道・アイテム・自分の道がないところ。
 * 消せるのは自分が引いた道だけ。追加も削除も、全部通るか全部通らないか。
 */
class WorldRoads
{
    /** @return list<array{0: int, 1: int}> 引いた道(引いた順) */
    public static function tiles(UserProfile $profile): array
    {
        return $profile->roads()->orderBy('id')->get(['x', 'y'])->map(fn (ProfileRoad $r) => [$r->x, $r->y])->all();
    }

    public static function has(UserProfile $profile, int $x, int $y): bool
    {
        return $profile->roads()->where('x', $x)->where('y', $y)->exists();
    }

    /**
     * @param  list<array{0: int, 1: int}>  $add
     * @param  list<array{0: int, 1: int}>  $remove
     * @return list<array{0: int, 1: int}> いまの全部
     */
    public static function apply(UserProfile $active, array $add, array $remove): array
    {
        return DB::transaction(function () use ($active, $add, $remove) {
            // 同時に引いても数・重なりが崩れないよう、プロフィールをロックしてから調べる
            $profile = UserProfile::query()->whereKey($active->id)->lockForUpdate()->firstOrFail();
            $key = fn (array $t) => "{$t[0]},{$t[1]}";
            $existing = collect(self::tiles($profile))->mapWithKeys(fn (array $t) => [$key($t) => $t]);
            $removing = collect($remove)->mapWithKeys(fn (array $t) => [$key($t) => $t]);
            $adding = collect($add)->mapWithKeys(fn (array $t) => [$key($t) => $t]);

            foreach ($removing as $k => $t) {
                abort_unless($existing->has($k), 422, 'そこには、あなたの道がないよ。');
            }

            $occupied = WorldPlacement::occupied($profile, 0);
            foreach ($adding as $k => $t) {
                [$x, $y] = $t;
                abort_unless(WorldLand::inBounds($x, $y), 422, 'そこには、道をひけないよ。');
                abort_unless(WorldLand::isOpen($x, $y, $profile->level), 422, 'まだ雲に隠れているよ。');
                abort_if(WorldLand::isBlocked($x, $y), 422, 'そこには、道をひけないよ。');
                abort_if($existing->has($k) || $removing->has($k), 422, 'そこには、もう道があるよ。');
                abort_if(isset($occupied[$k]), 422, 'アイテムがあるところには、道をひけないよ。');
            }

            abort_if($existing->count() - $removing->count() + $adding->count() > (int) config('world.roads.max'), 422, 'これ以上、道はひけないよ。');

            if ($removing->isNotEmpty()) {
                $profile->roads()->where(function ($q) use ($removing) {
                    foreach ($removing as $t) {
                        $q->orWhere(fn ($w) => $w->where('x', $t[0])->where('y', $t[1]));
                    }
                })->delete();
            }
            foreach ($adding as $t) {
                $profile->roads()->create(['x' => $t[0], 'y' => $t[1]]);
            }

            return self::tiles($profile);
        });
    }
}
