<?php

namespace Database\Seeders;

use App\Models\ShopItem;
use Illuminate\Database\Seeder;

/**
 * 町に置くアイテムの初期の品ぞろえ。レベルは10問正解で1上がるため、
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
