<?php

namespace App\Support;

/** 町のアイテムの値段(docs/design/2026-10-21-shop-prices-design.md)。元の値段から、config/world.php の price_scale で決める */
class ShopPricing
{
    public static function scaled(int $base): int
    {
        foreach (config('world.price_scale') as $band) {
            if ($base < $band['up_to']) {
                // 倍率1(小物)は、そのまま。上げた値段は、10の位に丸める
                return $band['multiplier'] == 1 ? $base : (int) (round($base * $band['multiplier'] / 10) * 10);
            }
        }

        return $base;
    }
}
