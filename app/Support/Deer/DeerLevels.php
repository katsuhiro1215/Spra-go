<?php

namespace App\Support\Deer;

/**
 * Spraと鹿。の面の番号(「ワールド-面」。1-1 〜 8-10)。
 * ログインしなくても遊べるのは、各ワールドの free_levels 番目まで(既定 2: 1-1・1-2・2-1・2-2 …)
 */
class DeerLevels
{
    public const PATTERN = '/^[1-8]-([1-9]|10)$/';

    public static function valid(string $level): bool
    {
        return preg_match(self::PATTERN, $level) === 1;
    }

    public static function isFree(string $level): bool
    {
        return self::valid($level) && (int) explode('-', $level)[1] <= config('deer.free_levels');
    }

    /** すべての面の番号(ワールドの順) */
    public static function all(): array
    {
        $out = [];
        for ($w = 1; $w <= 8; $w++) {
            for ($n = 1; $n <= 10; $n++) {
                $out[] = "{$w}-{$n}";
            }
        }

        return $out;
    }
}
