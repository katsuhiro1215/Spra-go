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
    /**
     * (x, y) を奥のマスにして使うマス。幅 $w は x の向き、高さ $h は y の向き(h を書かなければ w×w の正方形)
     *
     * @return list<array{0: int, 1: int}>
     */
    public static function tiles(int $x, int $y, int $w, ?int $h = null): array
    {
        $h ??= $w;
        $tiles = [];
        for ($dy = 0; $dy < $h; $dy++) {
            for ($dx = 0; $dx < $w; $dx++) {
                $tiles[] = [$x + $dx, $y + $dy];
            }
        }

        return $tiles;
    }

    /**
     * 置けなければ422。同時に置いても重ならないよう、プロフィールはロックしてから渡す。
     * $mirrored を渡すと、その向きの大きさで調べる(反転できるかを調べるとき)。置けないときの言葉は $blockedMessage で変えられる
     */
    public static function check(UserProfile $profile, ProfileWorldItem $item, int $x, int $y, ?bool $mirrored = null): void
    {
        $tiles = self::tiles($x, $y, ...$item->size($mirrored));

        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::inBounds($tx, $ty), 422, '土地の外には置けません。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::isOpen($tx, $ty, $profile->level), 422, 'まだ雲に隠れているよ。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_if(WorldLand::isBlocked($tx, $ty), 422, 'そこには置けません。');
        }

        foreach ($tiles as [$tx, $ty]) {
            abort_if(WorldRoads::has($profile, $tx, $ty), 422, 'そこには、あなたの引いた道があるよ。');
        }

        $occupied = self::occupied($profile, $item->id);
        foreach ($tiles as [$tx, $ty]) {
            abort_if(isset($occupied["{$tx},{$ty}"]), 422, 'そこにはもう置いてあります。');
        }
    }

    /** @return array<string, true> 自分以外の置いたアイテムが使っているマス */
    public static function occupied(UserProfile $profile, int $exceptId): array
    {
        $occupied = [];
        $others = $profile->worldItems()->with('shopItem')
            ->whereNotNull('x')->whereNotNull('y')->whereKeyNot($exceptId)->get();

        foreach ($others as $other) {
            foreach (self::tiles($other->x, $other->y, ...$other->size()) as [$ox, $oy]) {
                $occupied["{$ox},{$oy}"] = true;
            }
        }

        return $occupied;
    }
}
