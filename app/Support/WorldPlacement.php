<?php

namespace App\Support;

use App\Models\ProfileWorldItem;
use App\Models\UserProfile;

/**
 * アイテムを置けるかのチェック(docs/design/2026-09-27-spru-wave-e-design.md 3-4・4-3)。
 * 2×2の建物は (x, y) を奥のマスにして4マス使う。使うマスすべてについて、
 * 地図の外 → 雲 → 目印・道 → 重なり の順に調べ、最初に当てはまったものを返す。
 */
class WorldPlacement
{
    /** @return list<array{0: int, 1: int}> (x, y) を奥のマスにして使うマス */
    public static function tiles(int $x, int $y, int $footprint): array
    {
        $tiles = [];
        for ($dy = 0; $dy < $footprint; $dy++) {
            for ($dx = 0; $dx < $footprint; $dx++) {
                $tiles[] = [$x + $dx, $y + $dy];
            }
        }

        return $tiles;
    }

    /** 置けなければ422。同時に置いても4マスが重ならないよう、プロフィールはロックしてから渡す */
    public static function check(UserProfile $profile, ProfileWorldItem $item, int $x, int $y): void
    {
        $tiles = self::tiles($x, $y, $item->shopItem->footprint());

        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::inBounds($tx, $ty), 422, '土地の外には置けません。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::isOpen($tx, $ty, $profile->level), 422, 'まだ雲に隠れているよ。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_if(WorldLand::isBlocked($tx, $ty), 422, 'そこには置けません。');
        }

        $occupied = self::occupied($profile, $item->id);
        foreach ($tiles as [$tx, $ty]) {
            abort_if(isset($occupied["{$tx},{$ty}"]), 422, 'そこにはもう置いてあります。');
        }
    }

    /** @return array<string, true> 自分以外の置いたアイテムが使っているマス */
    private static function occupied(UserProfile $profile, int $exceptId): array
    {
        $occupied = [];
        $others = $profile->worldItems()->with('shopItem')
            ->whereNotNull('x')->whereNotNull('y')->whereKeyNot($exceptId)->get();

        foreach ($others as $other) {
            foreach (self::tiles($other->x, $other->y, $other->shopItem->footprint()) as [$ox, $oy]) {
                $occupied["{$ox},{$oy}"] = true;
            }
        }

        return $occupied;
    }
}
