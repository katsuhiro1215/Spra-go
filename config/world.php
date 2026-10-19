<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 学習ポイントの報酬額
    |--------------------------------------------------------------------------
    |
    | 学習ポイントは課金できない「学んだ証」。町のアイテムはこれでしか買えない
    | (docs/design/2026-09-26-world-town-design.md 4章)。
    |
    */

    // 答えたときのHPの増減。正解では減らず、不正解のときだけ減る(docs/design/2026-10-07-main-game-levels-design.md 3章)
    'hp' => ['correct' => 0, 'wrong' => -1],

    /*
    | 町のアイテムの値段の倍率(docs/design/2026-10-21-shop-prices-design.md)。WorldItemSeeder の元の値段から、段ごとに掛ける。
    | 'up_to' は、その値段まで(含まない)。小物は、そのまま。名所は、長く目指すものにする。10の位に丸める
    */
    'price_scale' => [
        ['up_to' => 100, 'multiplier' => 1],
        ['up_to' => 300, 'multiplier' => 2.5],
        ['up_to' => 600, 'multiplier' => 3],
        ['up_to' => PHP_INT_MAX, 'multiplier' => 5],
    ],

    'rewards' => [
        'answer_correct' => 10,
        'stage_clear' => 50,
        'welcome' => 100,
        // 正解のXP。難しい問題ほど多い(学習ポイントは難しさにかかわらず answer_correct)
        'xp_by_difficulty' => ['初級' => 10, '中級' => 15, '上級' => 20],
    ],

    /*
    | 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)。1日で最大 reward×3＋bonus
    */

    'errands' => [
        'first_target' => 5,     // 1つ目「問題に5問正解する」
        'fallback_target' => 10, // 候補が足りない日の「問題に10問正解する」
        'reward' => 20,          // 1つにつき
        'bonus' => 30,           // 3つそろったおまけ
        'partner_bond' => 3,     // 相棒のおつかいのなかよし度
    ],

    /*
    | レベルの上がり方: 次のレベルまでに必要なXP = round(base + linear × n + square × n², round の倍数に)。n = 今のレベル − 1。
    | 100から始まり、続けるほど上がりにくい。頭打ちはなし(docs/design/2026-10-07-header-level-design.md 6章)。
    */

    'level_curve' => ['base' => 100, 'linear' => 10, 'square' => 0.5, 'round' => 5],

    /*
    | 町のアイテムの絵として用意済みのキー。フロントの components/world/art-keys.ts と
    | 必ず一致させる(Ownerが絵の無いアイテムを登録できないようにするため。art-keys.test.ts で確かめる)。
    */

    /*
    | 好きな名所を1つ選ぶ回(docs/design/2026-10-08-town-growth-design.md 4-4)。first から step おき(12・22・32…)。
    | footprints は、その回に選べる大きさの上限(書いていない回は max_footprint)
    */

    'gifts' => ['first' => 12, 'step' => 10, 'footprints' => [12 => 2, 22 => 3], 'max_footprint' => 4],

    'asset_keys' => [
        'bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall',
        'stone_lantern', 'bamboo', 'fountain', 'palm', 'parasol', 'pagoda', 'castle', 'tower',
        'boat_small', 'boat_large',
        // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)
        'tulip', 'rock', 'sunflower', 'bush', 'momiji', 'pine', 'flower_pots', 'well', 'street_lamp', 'mailbox',
        'cottage', 'red_house', 'bakery', 'japanese_house', 'cafe', 'lighthouse',
        // 特別の名所(docs/design/2026-09-28-town-items-design.md 5-4。各国の有名な建物、高額でレア)
        'kinkakuji', 'sungnyemun', 'arc_de_triomphe', 'big_ben',
        // スプルラン限定(タネ交換所。docs/design/2026-10-22-spru-run-design.md 14-6)
        'run_seed_bed', 'run_signpost', 'run_trophy', 'run_gate', 'run_golden_seed',
        // Spra-worldの確定画像(docs/design/2026-10-05-world-items-stage1-design.md)
        'young_tree', 'pathside_flowers', 'pathside_stone', 'stream', 'vegetable_bed', 'broadleaf_tree', 'spring', 'large_tree', 'leaf_lamp',
        'wooden_bridge', 'woodland_torii', 'seed_storehouse', 'resident_cottage', 'leaf_cottage', 'blue_flower_cottage', 'forest_flower_house', 'greengrocer', 'fish_shop',
        'meat_shop', 'produce_shop', 'chief_hall', 'stone_tower_hall', 'windmill_garden', 'spru_mall', 'saku_mall',
        // 町らしさを足す追加分(2026-10-12。花・木・街の備品・暮らし・名所・家の成長・畑)
        'lavender', 'cosmos', 'hydrangea', 'rose_bed', 'hedge_square', 'topiary_ball', 'ginkgo', 'birch', 'plum_tree', 'fir_tree', 'willow', 'small_pond', 'wooden_fence', 'low_stone_wall', 'signpost', 'drinking_fountain', 'flower_arch', 'trash_bin', 'scarecrow', 'handcart', 'barrels_crates', 'firewood_pile', 'haystack', 'laundry_line', 'sky_tower', 'saku_blossom_tower', 'golden_leaf_temple', 'spru_house_lv2', 'spru_house_lv3', 'human_house', 'wheat_field', 'carrot_field', 'potato_field', 'onion_field', 'cabbage_field', 'tomato_field', 'cucumber_field', 'pumpkin_field', 'corn_field', 'eggplant_field', 'watermelon_field', 'himeji_castle', 'todaiji_hall', 'shuri_castle',
        // 町らしさの追加2(2026-10-13。柵・塀の向き、小さな建物、小さな生き物)
        'wooden_fence_b', 'low_stone_wall_b', 'fence_corner', 'fence_gate', 'stone_wall_corner', 'hedge_long', 'flower_shop', 'clinic', 'small_school', 'post_office', 'station_hut', 'fire_station', 'cat_sitting', 'dog_sitting', 'hen', 'sheep', 'birdhouse', 'beehive', 'stream_curve', 'stream_pool', 'car_red', 'taxi', 'motorbike', 'ambulance', 'bus_small', 'fire_truck', 'delivery_truck', 'tractor', 'train_engine', 'hot_air_balloon', 'sailboat', 'cart_horse_free',
    ],

    /*
    | 2×2・3×3マス使う絵(docs/design/2026-09-27-spru-wave-e-design.md 3-4、2026-10-07-town-sizes-design.md)。書いていない絵は1マス。
    | 形は正方形だけ(1・2・3。4×4は、もっと大きな物を考えるときに足す)。
    | Ownerがアイテムごとに大きさを変えられないよう、絵で決める。フロントの art-keys.ts の ASSET_FOOTPRINTS と必ず一致させる。
    | おみやげ(config/travel.php)の2個目もここに書く(F回)
    */

    'asset_footprints' => [
        'fountain' => 2, 'pagoda' => 3, 'castle' => 3, 'tower' => 2, 'boat_large' => 2,
        'borobudur' => 2, 'bulguksa' => 2, 'liberty' => 2, 'stonehenge' => 2, 'mont_saint_michel' => 2,
        'bakery' => 2, 'japanese_house' => 2, 'cafe' => 2, 'lighthouse' => 2,
        'kinkakuji' => 2, 'sungnyemun' => 2, 'arc_de_triomphe' => 2, 'big_ben' => 2, 'run_gate' => 2,
        'large_tree' => 2, 'greengrocer' => 2, 'fish_shop' => 2, 'meat_shop' => 2, 'produce_shop' => 2,
        'chief_hall' => 3, 'stone_tower_hall' => 2, 'windmill_garden' => 3, 'spru_mall' => 3, 'saku_mall' => 3,
        'sky_tower' => 2, 'saku_blossom_tower' => 2, 'golden_leaf_temple' => 2, 'spru_house_lv2' => 2, 'spru_house_lv3' => 2, 'human_house' => 2, 'wheat_field' => 2, 'carrot_field' => 2, 'potato_field' => 2, 'onion_field' => 2, 'cabbage_field' => 2, 'tomato_field' => 2, 'cucumber_field' => 2, 'pumpkin_field' => 2, 'corn_field' => 2, 'eggplant_field' => 2, 'watermelon_field' => 2, 'himeji_castle' => 3, 'bus_small' => 2, 'fire_truck' => 2, 'delivery_truck' => 2, 'tractor' => 2, 'train_engine' => 2,  'todaiji_hall' => 3, 'shuri_castle' => 3, 'flower_shop' => 2, 'clinic' => 2, 'small_school' => 2, 'post_office' => 2, 'station_hut' => 2, 'fire_station' => 2,
    ],

    /*
    | 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3-2)。絵のキーで決まり、Ownerは選ばない。
    | asset_keys のすべてのキーに付ける(種から咲くスプルの花も)。おみやげはキーによらず souvenir(ShopItem::category)。
    | フロントの art-keys.ts の ITEM_ART_CATEGORIES と必ず一致させる(art-keys.test.ts で確かめる)
    */

    'asset_categories' => [
        'flowerbed' => 'nature', 'tree' => 'nature', 'bamboo' => 'nature', 'sakura' => 'nature', 'palm' => 'nature',
        'spru_flower' => 'nature',
        'chochin' => 'decor', 'bench' => 'decor', 'stone_lantern' => 'decor', 'fountain' => 'decor',
        'parasol' => 'decor', 'vending' => 'decor',
        'stall' => 'house',
        'pagoda' => 'landmark', 'castle' => 'landmark', 'tower' => 'landmark',
        'bicycle' => 'vehicle', 'boat_small' => 'vehicle', 'boat_large' => 'vehicle',
        'tulip' => 'nature', 'rock' => 'nature', 'sunflower' => 'nature', 'bush' => 'nature', 'momiji' => 'nature', 'pine' => 'nature',
        'flower_pots' => 'decor', 'well' => 'decor', 'street_lamp' => 'decor', 'mailbox' => 'decor',
        'cottage' => 'house', 'red_house' => 'house', 'bakery' => 'house', 'japanese_house' => 'house', 'cafe' => 'house',
        'lighthouse' => 'landmark',
        'kinkakuji' => 'landmark', 'sungnyemun' => 'landmark', 'arc_de_triomphe' => 'landmark', 'big_ben' => 'landmark',
        'run_seed_bed' => 'nature', 'run_signpost' => 'decor', 'run_trophy' => 'decor', 'run_gate' => 'landmark', 'run_golden_seed' => 'landmark',
        // Spra-worldの確定画像(docs/design/2026-10-05-world-items-stage1-design.md)
        'young_tree' => 'nature', 'pathside_flowers' => 'nature', 'pathside_stone' => 'nature', 'stream' => 'nature',
        'vegetable_bed' => 'nature', 'broadleaf_tree' => 'nature', 'spring' => 'nature', 'large_tree' => 'nature',
        'leaf_lamp' => 'decor', 'wooden_bridge' => 'decor', 'woodland_torii' => 'landmark', 'seed_storehouse' => 'house',
        'resident_cottage' => 'house', 'leaf_cottage' => 'house', 'blue_flower_cottage' => 'house', 'forest_flower_house' => 'house',
        'greengrocer' => 'house', 'fish_shop' => 'house', 'meat_shop' => 'house', 'produce_shop' => 'house',
        'chief_hall' => 'landmark', 'stone_tower_hall' => 'landmark', 'windmill_garden' => 'landmark', 'spru_mall' => 'landmark',
        'saku_mall' => 'landmark',
        'lavender' => 'nature', 'cosmos' => 'nature', 'hydrangea' => 'nature', 'rose_bed' => 'nature', 'hedge_square' => 'nature', 'topiary_ball' => 'nature', 'ginkgo' => 'nature', 'birch' => 'nature', 'plum_tree' => 'nature', 'fir_tree' => 'nature', 'willow' => 'nature', 'small_pond' => 'nature', 'wooden_fence' => 'decor', 'low_stone_wall' => 'decor', 'signpost' => 'decor', 'drinking_fountain' => 'decor', 'flower_arch' => 'decor', 'trash_bin' => 'decor', 'scarecrow' => 'decor', 'handcart' => 'decor', 'barrels_crates' => 'decor', 'firewood_pile' => 'decor', 'haystack' => 'decor', 'laundry_line' => 'decor', 'sky_tower' => 'landmark', 'saku_blossom_tower' => 'landmark', 'golden_leaf_temple' => 'landmark', 'spru_house_lv2' => 'house', 'spru_house_lv3' => 'house', 'human_house' => 'house', 'wheat_field' => 'nature', 'carrot_field' => 'nature', 'potato_field' => 'nature', 'onion_field' => 'nature', 'cabbage_field' => 'nature', 'tomato_field' => 'nature', 'cucumber_field' => 'nature', 'pumpkin_field' => 'nature', 'corn_field' => 'nature', 'eggplant_field' => 'nature', 'watermelon_field' => 'nature', 'himeji_castle' => 'landmark', 'car_red' => 'vehicle', 'taxi' => 'vehicle', 'motorbike' => 'vehicle', 'ambulance' => 'vehicle', 'bus_small' => 'vehicle', 'fire_truck' => 'vehicle', 'delivery_truck' => 'vehicle', 'tractor' => 'vehicle', 'train_engine' => 'vehicle', 'hot_air_balloon' => 'vehicle', 'sailboat' => 'vehicle', 'cart_horse_free' => 'vehicle',  'todaiji_hall' => 'landmark', 'shuri_castle' => 'landmark', 'wooden_fence_b' => 'decor', 'low_stone_wall_b' => 'decor', 'fence_corner' => 'decor', 'fence_gate' => 'decor', 'stone_wall_corner' => 'decor', 'hedge_long' => 'nature', 'flower_shop' => 'house', 'clinic' => 'house', 'small_school' => 'house', 'post_office' => 'house', 'station_hut' => 'house', 'fire_station' => 'house', 'cat_sitting' => 'nature', 'dog_sitting' => 'nature', 'hen' => 'nature', 'sheep' => 'nature', 'birdhouse' => 'decor', 'beehive' => 'decor', 'stream_curve' => 'nature', 'stream_pool' => 'nature',
    ],

    /*
    | 土地(docs/design/2026-09-27-spru-wave-e-design.md 3-1)。x,yは0始まり。地図は区画を並べたもの(今は17×17。区画は7つ、Lv5ごとに開く)で、
    | 町の手前(xとyが大きくなる向き)へ広がる。形は全員同じなのでDBに持たず、人によって違うのは
    | レベルでどこまで開いているかだけ。目印・道がどの区画のものかは座標で決まる。目印と道のマスには置けない。
    */

    // 自分で引ける道(docs/design/2026-10-19-town-roads-design.md)。max は引ける数の上限(マス)
    'roads' => ['max' => 300],

    'land' => [
        'plots' => [
            ['key' => 'town', 'name' => 'はじまりの町', 'x' => 0, 'y' => 0, 'w' => 7, 'h' => 7, 'min_level' => 1, 'ground' => 'grass'],
            ['key' => 'bamboo', 'name' => '竹林', 'x' => 7, 'y' => 0, 'w' => 5, 'h' => 7, 'min_level' => 5, 'ground' => 'bamboo'],
            ['key' => 'beach', 'name' => '海辺', 'x' => 0, 'y' => 7, 'w' => 7, 'h' => 5, 'min_level' => 10, 'ground' => 'sand'],
            ['key' => 'hill', 'name' => '丘', 'x' => 7, 'y' => 7, 'w' => 5, 'h' => 5, 'min_level' => 15, 'ground' => 'hill'],
            ['key' => 'river', 'name' => '川辺', 'x' => 12, 'y' => 0, 'w' => 5, 'h' => 12, 'min_level' => 20, 'ground' => 'riverbank'],
            ['key' => 'plateau', 'name' => '高原', 'x' => 0, 'y' => 12, 'w' => 12, 'h' => 5, 'min_level' => 25, 'ground' => 'plateau'],
            ['key' => 'island', 'name' => '離島', 'x' => 12, 'y' => 12, 'w' => 5, 'h' => 5, 'min_level' => 30, 'ground' => 'islet'],
        ],
        'landmarks' => [
            ['key' => 'stone_lantern', 'x' => 2, 'y' => 0],
            ['key' => 'torii', 'x' => 3, 'y' => 0],
            ['key' => 'stone_lantern', 'x' => 4, 'y' => 0],
            // スプルの家は2×2。(0,1) を奥のマスにして4マス使う(footprint がない目印は1マス。docs/design/2026-10-07-town-sizes-design.md 4-3)。畑の左側
            ['key' => 'spru_house', 'x' => 0, 'y' => 1, 'footprint' => 2],
            // 十字の道(x=3・y=3)に面した畑。右(3,2)と手前(2,3)が道。種をまいて水やりする(目印なのでアイテムは置けない)。
            // Spruは、畑の前(道のマス)まで歩いてきて、「水をあげますか？」と聞く(docs/design/2026-10-19-garden-layout-design.md)
            ['key' => 'garden', 'x' => 2, 'y' => 2],
            ['key' => 'bamboo_grove', 'x' => 8, 'y' => 0],
            ['key' => 'bamboo_grove', 'x' => 10, 'y' => 1],
            ['key' => 'bamboo_grove', 'x' => 11, 'y' => 5],
            // 海辺の桟橋。F回で船旅の出発点にする
            ['key' => 'pier', 'x' => 2, 'y' => 11],
        ],
        // 道は格子状: 横の道が y=3 と y=9、縦の道が x=3(鳥居から南へ)と x=9。ブロックの中に家や店を並べる(2026-10-12 Owner指摘)
        'paths' => [
            // 横の道(町・竹林・川辺へ)
            [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [15, 3], [16, 3],
            // 横の道(海辺・丘・川辺の南へ)
            [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9],
            // 縦の道(鳥居から南へ。海辺・高原へ)
            [3, 1], [3, 2], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 10], [3, 11], [3, 12], [3, 13], [3, 14], [3, 15], [3, 16],
            // 縦の道(竹林・丘を南北へ)
            [9, 0], [9, 1], [9, 2], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], [9, 16],
        ],
        // 海にするところ(陸の四隅を欠いた海岸線)。[x, y, 幅, 高さ]。地図の外と同じで、何も置けない。北の隅は家と鳥居があるので陸のまま
        'water' => [[15, 0, 2, 2], [14, 14, 3, 3], [0, 15, 2, 2]],
        // Spruが立っている道のマス(道なのでアイテムと重ならない)。畑(0,2)の正面(1,3)に立つと、Spruの体で畑が隠れるので、少し右へ離す(2026-10-15 Owner指摘)
        'spru' => ['x' => 4, 'y' => 3],
    ],

    /*
    | 生まれた仲間の立ち位置(道のマス)。生まれた順に使う。6人目以降を足すときは位置も足す。
    | 畑(2,2)の前にあたる(3,2)と(2,3)は、Spruが水やりに立つ場所で、仲間の体が畑を覆うので使わない。Spruが立つ(4,3)も使わない
    */

    'companion_spots' => [[3, 4], [5, 3], [6, 3], [7, 3], [8, 3]],

    /*
    | 家族の町のあいさつ。自由には書けず、この3つから選ぶ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)。
    | 画面の components/family/greet-panel.tsx と必ず一致させる
    */

    'greeting_stamps' => [
        'hello' => 'やっほー！',
        'nice_town' => 'すてきな町だね！',
        'cheer' => 'いっしょにがんばろう！',
    ],

    // 町を開いたときに出す、まだ見ていないあいさつの数の上限
    'greetings_shown' => 10,

];
