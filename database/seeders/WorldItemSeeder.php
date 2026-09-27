<?php

namespace Database\Seeders;

use App\Models\ShopItem;
use Illuminate\Database\Seeder;

/**
 * 町に置くアイテムの初期の品ぞろえ。レベルは最初10問正解で1上がり、だんだん上がりにくくなる(config/world.php の level_curve)ため、
 * 必要レベルはLv.1〜12に散らしている。何度実行しても重複しない。
 */
class WorldItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'ベンチ', 'price' => 30, 'min_level' => 1, 'asset_key' => 'bench'],
            ['name' => '花だん', 'price' => 20, 'min_level' => 1, 'asset_key' => 'flowerbed'],
            ['name' => 'ちょうちん', 'price' => 25, 'min_level' => 1, 'asset_key' => 'chochin'],
            ['name' => '木', 'price' => 30, 'min_level' => 2, 'asset_key' => 'tree'],
            ['name' => '桜の木', 'price' => 50, 'min_level' => 4, 'asset_key' => 'sakura'],
            ['name' => '自動販売機', 'price' => 60, 'min_level' => 6, 'asset_key' => 'vending'],
            ['name' => '自転車', 'price' => 80, 'min_level' => 8, 'asset_key' => 'bicycle'],
            ['name' => '屋台', 'price' => 120, 'min_level' => 12, 'asset_key' => 'stall'],
            // E回(docs/design/2026-09-27-spru-wave-e-design.md 3-5)。区画が開くレベルに合わせる
            ['name' => '石灯籠', 'price' => 30, 'min_level' => 3, 'asset_key' => 'stone_lantern'],
            ['name' => '竹', 'price' => 25, 'min_level' => 4, 'asset_key' => 'bamboo'],
            ['name' => '噴水', 'price' => 150, 'min_level' => 5, 'asset_key' => 'fountain'],
            ['name' => 'ヤシの木', 'price' => 40, 'min_level' => 7, 'asset_key' => 'palm'],
            ['name' => 'ビーチパラソル', 'price' => 35, 'min_level' => 7, 'asset_key' => 'parasol'],
            ['name' => '五重塔', 'price' => 300, 'min_level' => 9, 'asset_key' => 'pagoda'],
            ['name' => 'お城', 'price' => 400, 'min_level' => 10, 'asset_key' => 'castle'],
            ['name' => 'タワー', 'price' => 500, 'min_level' => 12, 'asset_key' => 'tower'],
        ];

        foreach ($items as $item) {
            ShopItem::query()->updateOrCreate(
                ['type' => 'decoration', 'name' => $item['name']],
                [
                    'price' => $item['price'],
                    'currency' => 'point',
                    'min_level' => $item['min_level'],
                    'meta' => ['asset_key' => $item['asset_key']],
                ],
            );
        }
    }
}
