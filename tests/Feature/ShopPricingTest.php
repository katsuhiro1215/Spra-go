<?php

use App\Models\ShopItem;
use App\Support\ShopPricing;
use Database\Seeders\WorldItemSeeder;

// docs/design/2026-10-21-shop-prices-design.md（町のアイテムの値段）

it('小物はそのまま、100〜299は2.5倍、300〜599は3倍、600以上は5倍（10の位に丸める）', function () {
    expect(ShopPricing::scaled(15))->toBe(15)
        ->and(ShopPricing::scaled(90))->toBe(90)
        ->and(ShopPricing::scaled(100))->toBe(250)
        ->and(ShopPricing::scaled(130))->toBe(330)
        ->and(ShopPricing::scaled(220))->toBe(550)
        ->and(ShopPricing::scaled(300))->toBe(900)
        ->and(ShopPricing::scaled(450))->toBe(1350)
        ->and(ShopPricing::scaled(600))->toBe(3000)
        ->and(ShopPricing::scaled(1200))->toBe(6000);
});

it('シーダーは、倍率をかけた値段を入れ、何度流しても同じ値段になる', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    expect(ShopItem::where('name', 'ベンチ')->value('price'))->toBe(30)
        ->and(ShopItem::where('name', 'お城')->value('price'))->toBe(1200)
        ->and(ShopItem::where('name', '首里城')->value('price'))->toBe(6000)
        ->and(ShopItem::where('name', 'ベンチ')->count())->toBe(1);
});
