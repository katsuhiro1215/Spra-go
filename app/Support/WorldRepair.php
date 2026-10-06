<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * 置けなくなった物をバッグに戻す(docs/design/2026-10-07-town-sizes-design.md 4-4)。
 * 建物の大きさが変わった・家が大きくなった・畑や道が動いた、などのあとに流す。物は消さず、置き場所(x, y)だけを空にする。
 * 置けるかは、使うマスすべてについて 地図の外 → 雲(その子のレベル) → 目印・道 → 重なり の順に調べる。
 * 重なるときは、先に置いた(番号の小さい)物を残す。何度流しても同じ結果になる
 */
class WorldRepair
{
    /**
     * 全員の置き物を調べ、置けない物をバッグに戻す
     *
     * @return array<int, list<int>> プロフィールの番号 => バッグに戻した(戻す)物の番号
     */
    public static function run(bool $dryRun = false): array
    {
        $result = [];

        UserProfile::query()->whereHas('worldItems', fn ($query) => $query->whereNotNull('x')->whereNotNull('y'))
            ->orderBy('id')->each(function (UserProfile $profile) use ($dryRun, &$result) {
                $unplaceable = self::unplaceable($profile);
                if ($unplaceable === []) {
                    return;
                }
                if (! $dryRun) {
                    $profile->worldItems()->whereIn('id', $unplaceable)->update(['x' => null, 'y' => null]);
                }
                $result[$profile->id] = $unplaceable;
            });

        return $result;
    }

    /**
     * その子の町で、今の決まりでは置けない物の番号(置いた順に調べ、先に置いた物のマスを使う物は戻す)
     *
     * @return list<int>
     */
    public static function unplaceable(UserProfile $profile): array
    {
        $occupied = [];
        $unplaceable = [];

        $items = $profile->worldItems()->with('shopItem')->whereNotNull('x')->whereNotNull('y')->orderBy('id')->get();

        foreach ($items as $item) {
            $tiles = WorldPlacement::tiles($item->x, $item->y, $item->shopItem->footprint());

            if (! self::terrainAllows($tiles, $profile->level) || self::overlaps($tiles, $occupied)) {
                $unplaceable[] = $item->id;

                continue;
            }
            foreach ($tiles as [$x, $y]) {
                $occupied["{$x},{$y}"] = true;
            }
        }

        return $unplaceable;
    }

    /** @param  list<array{0: int, 1: int}>  $tiles */
    private static function terrainAllows(array $tiles, int $level): bool
    {
        foreach ($tiles as [$x, $y]) {
            if (! WorldLand::inBounds($x, $y) || ! WorldLand::isOpen($x, $y, $level) || WorldLand::isBlocked($x, $y)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<array{0: int, 1: int}>  $tiles
     * @param  array<string, true>  $occupied
     */
    private static function overlaps(array $tiles, array $occupied): bool
    {
        foreach ($tiles as [$x, $y]) {
            if (isset($occupied["{$x},{$y}"])) {
                return true;
            }
        }

        return false;
    }
}
