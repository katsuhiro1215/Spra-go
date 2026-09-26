<?php

namespace App\Support;

class WorldLand
{
    public static function size(): int
    {
        return (int) config('world.land.size');
    }

    /** @return list<array{key: string, x: int, y: int}> */
    public static function landmarks(): array
    {
        return config('world.land.landmarks');
    }

    /** @return list<array{0: int, 1: int}> */
    public static function paths(): array
    {
        return config('world.land.paths');
    }

    /** @return list<array{0: int, 1: int}> 目印と道のマス(置けないマス) */
    public static function blocked(): array
    {
        $tiles = array_map(fn (array $landmark) => [$landmark['x'], $landmark['y']], self::landmarks());

        foreach (self::paths() as [$x, $y]) {
            $tiles[] = [$x, $y];
        }

        return array_values(array_unique($tiles, SORT_REGULAR));
    }

    public static function inBounds(int $x, int $y): bool
    {
        $size = self::size();

        return $x >= 0 && $y >= 0 && $x < $size && $y < $size;
    }

    public static function isBlocked(int $x, int $y): bool
    {
        return in_array([$x, $y], self::blocked(), true);
    }

    public static function toArray(): array
    {
        return [
            'size' => self::size(),
            'landmarks' => self::landmarks(),
            'paths' => self::paths(),
            'blocked' => self::blocked(),
            'spru' => config('world.land.spru'),
        ];
    }
}
