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
            // F回(docs/design/2026-09-27-spru-wave-f-design.md 3-3)。旅じたく。インドネシア・アメリカへの旅に使う
            ['name' => '小さな船', 'price' => 200, 'min_level' => 7, 'asset_key' => 'boat_small'],
            ['name' => '大きな船', 'price' => 450, 'min_level' => 11, 'asset_key' => 'boat_large'],
            // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)。序盤(Lv.1〜3)の物を多めにした
            ['name' => 'チューリップ', 'price' => 15, 'min_level' => 1, 'asset_key' => 'tulip'],
            ['name' => '岩と草', 'price' => 15, 'min_level' => 2, 'asset_key' => 'rock'],
            ['name' => 'ひまわり', 'price' => 25, 'min_level' => 3, 'asset_key' => 'sunflower'],
            ['name' => 'まるい植え込み', 'price' => 20, 'min_level' => 4, 'asset_key' => 'bush'],
            ['name' => 'もみじ', 'price' => 50, 'min_level' => 5, 'asset_key' => 'momiji'],
            ['name' => '松', 'price' => 45, 'min_level' => 6, 'asset_key' => 'pine'],
            ['name' => '植木鉢', 'price' => 15, 'min_level' => 1, 'asset_key' => 'flower_pots'],
            ['name' => '井戸', 'price' => 50, 'min_level' => 2, 'asset_key' => 'well'],
            ['name' => '街灯', 'price' => 40, 'min_level' => 3, 'asset_key' => 'street_lamp'],
            ['name' => 'ポスト', 'price' => 35, 'min_level' => 5, 'asset_key' => 'mailbox'],
            ['name' => '小さな家', 'price' => 120, 'min_level' => 2, 'asset_key' => 'cottage'],
            ['name' => '赤い屋根の家', 'price' => 180, 'min_level' => 5, 'asset_key' => 'red_house'],
            ['name' => 'パン屋', 'price' => 250, 'min_level' => 6, 'asset_key' => 'bakery'],
            ['name' => '和風の家', 'price' => 280, 'min_level' => 8, 'asset_key' => 'japanese_house'],
            ['name' => 'カフェ', 'price' => 320, 'min_level' => 9, 'asset_key' => 'cafe'],
            ['name' => '灯台', 'price' => 350, 'min_level' => 9, 'asset_key' => 'lighthouse'],
            // 特別の名所(docs/design/2026-09-28-town-items-design.md 5-4)。Lv10から上の目標になる、高額でレアな各国の有名な建物
            ['name' => '金閣寺', 'price' => 600, 'min_level' => 10, 'asset_key' => 'kinkakuji'],
            ['name' => '南大門', 'price' => 650, 'min_level' => 11, 'asset_key' => 'sungnyemun'],
            ['name' => '凱旋門', 'price' => 750, 'min_level' => 13, 'asset_key' => 'arc_de_triomphe'],
            ['name' => 'ビッグ・ベン', 'price' => 900, 'min_level' => 15, 'asset_key' => 'big_ben'],
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
