<?php

namespace App\Support;

/**
 * 土地(docs/design/2026-09-27-spru-wave-e-design.md 3-1)。形は全員同じで設定ファイルに持ち、
 * 人によって違うのは、レベルでどこまで開いているかだけ。
 */
class WorldLand
{
    /** @return list<array{key: string, name: string, x: int, y: int, w: int, h: int, min_level: int, ground: string}> */
    public static function plots(): array
    {
        return config('world.land.plots');
    }

    public static function width(): int
    {
        return max(array_map(fn (array $plot) => $plot['x'] + $plot['w'], self::plots()));
    }

    public static function height(): int
    {
        return max(array_map(fn (array $plot) => $plot['y'] + $plot['h'], self::plots()));
    }

    /** @return array{key: string, name: string, x: int, y: int, w: int, h: int, min_level: int, ground: string}|null マスが入っている区画 */
    public static function plotAt(int $x, int $y): ?array
    {
        foreach (self::plots() as $plot) {
            if ($x >= $plot['x'] && $x < $plot['x'] + $plot['w'] && $y >= $plot['y'] && $y < $plot['y'] + $plot['h']) {
                return $plot;
            }
        }

        return null;
    }

    /** 地図の中か(どれかの区画に入っているか) */
    public static function inBounds(int $x, int $y): bool
    {
        return self::plotAt($x, $y) !== null;
    }

    public static function isOpen(int $x, int $y, int $level): bool
    {
        $plot = self::plotAt($x, $y);

        return $plot !== null && $level >= $plot['min_level'];
    }

    /** @return list<string> */
    public static function openPlotKeys(int $level): array
    {
        return array_values(array_map(
            fn (array $plot) => $plot['key'],
            array_filter(self::plots(), fn (array $plot) => $level >= $plot['min_level']),
        ));
    }

    /**
     * 開いたが、まだ祝っていない区画(最初から開いている区画は祝わない。必要レベルの低い順)
     *
     * @param  list<string>  $seen
     * @return list<string>
     */
    public static function newPlotKeys(int $level, array $seen): array
    {
        $plots = array_filter(
            self::plots(),
            fn (array $plot) => $plot['min_level'] > 1 && $level >= $plot['min_level'] && ! in_array($plot['key'], $seen, true),
        );
        usort($plots, fn (array $a, array $b) => $a['min_level'] <=> $b['min_level']);

        return array_map(fn (array $plot) => $plot['key'], $plots);
    }

    /** @return list<array{key: string, x: int, y: int, footprint?: int}> 全区画の目印。footprint(N×Nマス)がなければ1マス */
    public static function landmarks(): array
    {
        return config('world.land.landmarks');
    }

    /** @return list<array{0: int, 1: int}> 全区画の道 */
    public static function paths(): array
    {
        return config('world.land.paths');
    }

    /** @return list<array{0: int, 1: int}> 目印と道のマス(置けないマス。全区画) */
    public static function blocked(): array
    {
        $tiles = [];
        foreach (self::landmarks() as $landmark) {
            $size = $landmark['footprint'] ?? 1;
            for ($dy = 0; $dy < $size; $dy++) {
                for ($dx = 0; $dx < $size; $dx++) {
                    $tiles[] = [$landmark['x'] + $dx, $landmark['y'] + $dy];
                }
            }
        }

        foreach (self::paths() as [$x, $y]) {
            $tiles[] = [$x, $y];
        }

        return array_values(array_unique($tiles, SORT_REGULAR));
    }

    public static function isBlocked(int $x, int $y): bool
    {
        return in_array([$x, $y], self::blocked(), true);
    }

    /** 町のAPIに出す土地。区画は雲の区画も含めてすべて、目印・道・置けないマスは開いた区画のものだけ */
    public static function toArray(int $level): array
    {
        $open = fn (int $x, int $y) => self::isOpen($x, $y, $level);

        return [
            'width' => self::width(),
            'height' => self::height(),
            'plots' => array_map(fn (array $plot) => [...$plot, 'unlocked' => $level >= $plot['min_level']], self::plots()),
            'landmarks' => array_values(array_filter(self::landmarks(), fn (array $l) => $open($l['x'], $l['y']))),
            'paths' => array_values(array_filter(self::paths(), fn (array $t) => $open($t[0], $t[1]))),
            'blocked' => array_values(array_filter(self::blocked(), fn (array $t) => $open($t[0], $t[1]))),
            'spru' => config('world.land.spru'),
        ];
    }
}
