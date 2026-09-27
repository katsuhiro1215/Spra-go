<?php

namespace App\Support;

/**
 * レベルの上がり方(docs/design/2026-09-27-spru-wave-b-design.md 3-6)。
 * 上限を付けて、上がらなさすぎてやめてしまわないようにする。
 */
class LevelCurve
{
    /** 今のレベルから次のレベルまでに必要なXP */
    public static function xpToNext(int $level): int
    {
        $curve = config('world.level_curve');

        return min($curve['base'] + $curve['step'] * ($level - 1), $curve['max']);
    }

    /** そのレベルに届くまでの合計XP(Lv.1は0) */
    public static function totalXpFor(int $level): int
    {
        $total = 0;
        for ($l = 1; $l < $level; $l++) {
            $total += self::xpToNext($l);
        }

        return $total;
    }

    public static function levelForXp(int $xp): int
    {
        $level = 1;
        $reached = 0;
        while ($xp >= $reached + self::xpToNext($level)) {
            $reached += self::xpToNext($level);
            $level++;
        }

        return $level;
    }

    /** @return array{floor: int, next: int} 町の上のバーに使う(今のレベルに届いた合計XPと、次のレベルの合計XP) */
    public static function progress(int $level): array
    {
        return ['floor' => self::totalXpFor($level), 'next' => self::totalXpFor($level + 1)];
    }
}
