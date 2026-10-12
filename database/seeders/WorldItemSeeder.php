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
            // Spra-worldの確定画像(docs/design/2026-10-05-world-items-stage1-design.md)
            ['name' => '若い木', 'price' => 15, 'min_level' => 1, 'asset_key' => 'young_tree'],
            ['name' => '道ばたの花', 'price' => 15, 'min_level' => 1, 'asset_key' => 'pathside_flowers'],
            ['name' => '道ばたの石', 'price' => 15, 'min_level' => 2, 'asset_key' => 'pathside_stone'],
            ['name' => '小川', 'price' => 40, 'min_level' => 3, 'asset_key' => 'stream'],
            ['name' => '菜園', 'price' => 35, 'min_level' => 3, 'asset_key' => 'vegetable_bed'],
            ['name' => '広葉樹', 'price' => 60, 'min_level' => 4, 'asset_key' => 'broadleaf_tree'],
            ['name' => 'わき水の泉', 'price' => 60, 'min_level' => 5, 'asset_key' => 'spring'],
            ['name' => '大きな木', 'price' => 150, 'min_level' => 8, 'asset_key' => 'large_tree'],
            ['name' => 'はっぱの街灯', 'price' => 45, 'min_level' => 4, 'asset_key' => 'leaf_lamp'],
            ['name' => '木の橋', 'price' => 70, 'min_level' => 5, 'asset_key' => 'wooden_bridge'],
            ['name' => '鳥居', 'price' => 90, 'min_level' => 6, 'asset_key' => 'woodland_torii'],
            ['name' => '種の倉庫', 'price' => 120, 'min_level' => 3, 'asset_key' => 'seed_storehouse'],
            ['name' => '村人の家', 'price' => 140, 'min_level' => 4, 'asset_key' => 'resident_cottage'],
            ['name' => '葉の屋根の家', 'price' => 160, 'min_level' => 5, 'asset_key' => 'leaf_cottage'],
            ['name' => '青い花の家', 'price' => 170, 'min_level' => 6, 'asset_key' => 'blue_flower_cottage'],
            ['name' => '森の花の家', 'price' => 180, 'min_level' => 7, 'asset_key' => 'forest_flower_house'],
            ['name' => '八百屋', 'price' => 260, 'min_level' => 7, 'asset_key' => 'greengrocer'],
            ['name' => '魚屋', 'price' => 270, 'min_level' => 8, 'asset_key' => 'fish_shop'],
            ['name' => '肉屋', 'price' => 280, 'min_level' => 8, 'asset_key' => 'meat_shop'],
            ['name' => '野菜のお店', 'price' => 300, 'min_level' => 9, 'asset_key' => 'produce_shop'],
            ['name' => '村長の家', 'price' => 380, 'min_level' => 10, 'asset_key' => 'chief_hall'],
            ['name' => '石の塔の家', 'price' => 420, 'min_level' => 11, 'asset_key' => 'stone_tower_hall'],
            ['name' => '風車と水の庭', 'price' => 450, 'min_level' => 12, 'asset_key' => 'windmill_garden'],
            ['name' => 'スプルモール', 'price' => 650, 'min_level' => 13, 'asset_key' => 'spru_mall'],
            ['name' => 'サクモール', 'price' => 700, 'min_level' => 14, 'asset_key' => 'saku_mall'],
            // 町らしさを足す追加分(2026-10-12)。花・木・街の備品・暮らし・名所・家の成長・畑
            ['name' => 'ラベンダー', 'price' => 20, 'min_level' => 2, 'asset_key' => 'lavender'],
            ['name' => 'コスモス', 'price' => 20, 'min_level' => 2, 'asset_key' => 'cosmos'],
            ['name' => 'あじさい', 'price' => 30, 'min_level' => 4, 'asset_key' => 'hydrangea'],
            ['name' => 'バラの花壇', 'price' => 40, 'min_level' => 5, 'asset_key' => 'rose_bed'],
            ['name' => '四角い生け垣', 'price' => 25, 'min_level' => 3, 'asset_key' => 'hedge_square'],
            ['name' => '丸く刈った木', 'price' => 35, 'min_level' => 5, 'asset_key' => 'topiary_ball'],
            ['name' => 'イチョウ', 'price' => 55, 'min_level' => 6, 'asset_key' => 'ginkgo'],
            ['name' => '白樺', 'price' => 45, 'min_level' => 4, 'asset_key' => 'birch'],
            ['name' => '梅の木', 'price' => 55, 'min_level' => 5, 'asset_key' => 'plum_tree'],
            ['name' => 'モミの木', 'price' => 45, 'min_level' => 3, 'asset_key' => 'fir_tree'],
            ['name' => '柳', 'price' => 60, 'min_level' => 8, 'asset_key' => 'willow'],
            ['name' => '小さな池', 'price' => 80, 'min_level' => 6, 'asset_key' => 'small_pond'],
            ['name' => '木の柵', 'price' => 15, 'min_level' => 1, 'asset_key' => 'wooden_fence'],
            ['name' => '低い石の塀', 'price' => 20, 'min_level' => 2, 'asset_key' => 'low_stone_wall'],
            ['name' => '立て札', 'price' => 20, 'min_level' => 2, 'asset_key' => 'signpost'],
            ['name' => '水飲み場', 'price' => 45, 'min_level' => 4, 'asset_key' => 'drinking_fountain'],
            ['name' => '花のアーチ', 'price' => 60, 'min_level' => 7, 'asset_key' => 'flower_arch'],
            ['name' => 'ごみ箱', 'price' => 15, 'min_level' => 1, 'asset_key' => 'trash_bin'],
            ['name' => '案山子', 'price' => 40, 'min_level' => 3, 'asset_key' => 'scarecrow'],
            ['name' => '荷車', 'price' => 50, 'min_level' => 4, 'asset_key' => 'handcart'],
            ['name' => '樽と木箱', 'price' => 35, 'min_level' => 3, 'asset_key' => 'barrels_crates'],
            ['name' => '薪の山', 'price' => 30, 'min_level' => 3, 'asset_key' => 'firewood_pile'],
            ['name' => '干し草の山', 'price' => 35, 'min_level' => 3, 'asset_key' => 'haystack'],
            ['name' => '洗濯物', 'price' => 40, 'min_level' => 4, 'asset_key' => 'laundry_line'],
            ['name' => 'スプルのスカイタワー', 'price' => 600, 'min_level' => 14, 'asset_key' => 'sky_tower'],
            ['name' => 'サクの花の塔', 'price' => 750, 'min_level' => 16, 'asset_key' => 'saku_blossom_tower'],
            ['name' => '金色の葉の寺', 'price' => 800, 'min_level' => 16, 'asset_key' => 'golden_leaf_temple'],
            ['name' => 'スプルの家 Lv2', 'price' => 200, 'min_level' => 9, 'asset_key' => 'spru_house_lv2'],
            ['name' => 'スプルの家 Lv3', 'price' => 300, 'min_level' => 12, 'asset_key' => 'spru_house_lv3'],
            ['name' => '青い屋根の家', 'price' => 220, 'min_level' => 8, 'asset_key' => 'human_house'],
            ['name' => '小麦畑', 'price' => 120, 'min_level' => 3, 'asset_key' => 'wheat_field'],
            ['name' => 'にんじん畑', 'price' => 130, 'min_level' => 4, 'asset_key' => 'carrot_field'],
            ['name' => 'じゃがいも畑', 'price' => 130, 'min_level' => 4, 'asset_key' => 'potato_field'],
            ['name' => '玉ねぎ畑', 'price' => 130, 'min_level' => 5, 'asset_key' => 'onion_field'],
            ['name' => 'キャベツ畑', 'price' => 150, 'min_level' => 6, 'asset_key' => 'cabbage_field'],
            ['name' => 'トマト畑', 'price' => 150, 'min_level' => 7, 'asset_key' => 'tomato_field'],
            ['name' => 'きゅうり畑', 'price' => 150, 'min_level' => 7, 'asset_key' => 'cucumber_field'],
            ['name' => 'かぼちゃ畑', 'price' => 170, 'min_level' => 8, 'asset_key' => 'pumpkin_field'],
            ['name' => 'とうもろこし畑', 'price' => 170, 'min_level' => 8, 'asset_key' => 'corn_field'],
            ['name' => 'なす畑', 'price' => 170, 'min_level' => 9, 'asset_key' => 'eggplant_field'],
            ['name' => 'スイカ畑', 'price' => 190, 'min_level' => 10, 'asset_key' => 'watermelon_field'],
            // 日本の名所(2026-10-13)。3×3の大きな名所。Spra風の独自の姿
            ['name' => '姫路城', 'price' => 1000, 'min_level' => 17, 'asset_key' => 'himeji_castle'],
            ['name' => '東大寺', 'price' => 1100, 'min_level' => 18, 'asset_key' => 'todaiji_hall'],
            ['name' => '首里城', 'price' => 1200, 'min_level' => 19, 'asset_key' => 'shuri_castle'],
            // 町らしさの追加2(2026-10-13)。柵・塀の向き、小さな建物、小さな生き物
            ['name' => '木の柵(反対向き)', 'price' => 15, 'min_level' => 1, 'asset_key' => 'wooden_fence_b'],
            ['name' => '低い石の塀(反対向き)', 'price' => 20, 'min_level' => 2, 'asset_key' => 'low_stone_wall_b'],
            ['name' => '木の柵の角', 'price' => 15, 'min_level' => 2, 'asset_key' => 'fence_corner'],
            ['name' => '木の柵の門', 'price' => 25, 'min_level' => 3, 'asset_key' => 'fence_gate'],
            ['name' => '石の塀の角', 'price' => 20, 'min_level' => 2, 'asset_key' => 'stone_wall_corner'],
            ['name' => '長い生け垣', 'price' => 30, 'min_level' => 3, 'asset_key' => 'hedge_long'],
            ['name' => '花屋', 'price' => 260, 'min_level' => 8, 'asset_key' => 'flower_shop'],
            ['name' => '診療所', 'price' => 280, 'min_level' => 9, 'asset_key' => 'clinic'],
            ['name' => '小さな学校', 'price' => 320, 'min_level' => 10, 'asset_key' => 'small_school'],
            ['name' => '郵便局', 'price' => 270, 'min_level' => 8, 'asset_key' => 'post_office'],
            ['name' => '駅の小屋', 'price' => 300, 'min_level' => 9, 'asset_key' => 'station_hut'],
            ['name' => '消防小屋', 'price' => 330, 'min_level' => 10, 'asset_key' => 'fire_station'],
            ['name' => '座る猫', 'price' => 40, 'min_level' => 3, 'asset_key' => 'cat_sitting'],
            ['name' => '座る犬', 'price' => 40, 'min_level' => 3, 'asset_key' => 'dog_sitting'],
            ['name' => 'ニワトリ', 'price' => 35, 'min_level' => 2, 'asset_key' => 'hen'],
            ['name' => 'ひつじ', 'price' => 45, 'min_level' => 4, 'asset_key' => 'sheep'],
            ['name' => '小鳥の巣箱', 'price' => 40, 'min_level' => 3, 'asset_key' => 'birdhouse'],
            ['name' => 'ミツバチの巣箱', 'price' => 50, 'min_level' => 4, 'asset_key' => 'beehive'],
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
