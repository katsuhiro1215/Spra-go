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
    | レベルの上がり方: 次のレベルまでに必要なXP = min(base + step × (今のレベル − 1), max)。
    | 最初は上がりやすく、続けるほど上がりにくい(docs/design/2026-09-27-spru-wave-b-design.md 3-6)。
    */

    'level_curve' => ['base' => 100, 'step' => 20, 'max' => 300],

    /*
    | 町のアイテムの絵として用意済みのキー。フロントの components/world/art-keys.ts と
    | 必ず一致させる(Ownerが絵の無いアイテムを登録できないようにするため。art-keys.test.ts で確かめる)。
    */

    'asset_keys' => [
        'bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall',
        'stone_lantern', 'bamboo', 'fountain', 'palm', 'parasol', 'pagoda', 'castle', 'tower',
        'boat_small', 'boat_large',
    ],

    /*
    | 2×2マス使う絵(docs/design/2026-09-27-spru-wave-e-design.md 3-4)。書いていない絵は1マス。
    | Ownerがアイテムごとに大きさを変えられないよう、絵で決める。フロントの art-keys.ts の BIG_ASSETS と必ず一致させる。
    | おみやげ(config/travel.php)の2個目もここに書く(F回)
    */

    'asset_footprints' => [
        'fountain' => 2, 'pagoda' => 2, 'castle' => 2, 'tower' => 2, 'boat_large' => 2,
        'borobudur' => 2, 'bulguksa' => 2, 'liberty' => 2, 'stonehenge' => 2, 'mont_saint_michel' => 2,
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
    ],

    /*
    | 土地(docs/design/2026-09-27-spru-wave-e-design.md 3-1)。x,yは0始まり。地図は区画を並べたもの(今は12×12)で、
    | 町の手前(xとyが大きくなる向き)へ広がる。形は全員同じなのでDBに持たず、人によって違うのは
    | レベルでどこまで開いているかだけ。目印・道がどの区画のものかは座標で決まる。目印と道のマスには置けない。
    */

    'land' => [
        'plots' => [
            ['key' => 'town', 'name' => 'はじまりの町', 'x' => 0, 'y' => 0, 'w' => 7, 'h' => 7, 'min_level' => 1, 'ground' => 'grass'],
            ['key' => 'bamboo', 'name' => '竹林', 'x' => 7, 'y' => 0, 'w' => 5, 'h' => 7, 'min_level' => 4, 'ground' => 'bamboo'],
            ['key' => 'beach', 'name' => '海辺', 'x' => 0, 'y' => 7, 'w' => 7, 'h' => 5, 'min_level' => 7, 'ground' => 'sand'],
            ['key' => 'hill', 'name' => '丘', 'x' => 7, 'y' => 7, 'w' => 5, 'h' => 5, 'min_level' => 10, 'ground' => 'hill'],
        ],
        'landmarks' => [
            ['key' => 'stone_lantern', 'x' => 2, 'y' => 0],
            ['key' => 'torii', 'x' => 3, 'y' => 0],
            ['key' => 'stone_lantern', 'x' => 4, 'y' => 0],
            ['key' => 'spru_house', 'x' => 1, 'y' => 1],
            // スプルの家の前の畑。種をまいて水やりする(目印なのでアイテムは置けない)
            ['key' => 'garden', 'x' => 1, 'y' => 2],
            ['key' => 'bamboo_grove', 'x' => 8, 'y' => 0],
            ['key' => 'bamboo_grove', 'x' => 10, 'y' => 1],
            ['key' => 'bamboo_grove', 'x' => 11, 'y' => 5],
            // 海辺の桟橋。F回で船旅の出発点にする
            ['key' => 'pier', 'x' => 2, 'y' => 11],
        ],
        'paths' => [
            [3, 1], [3, 2],
            [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
            // 竹林へ続く町の道
            [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
        ],
        // Spruが立っている道のマス(道なのでアイテムと重ならない)
        'spru' => ['x' => 1, 'y' => 3],
    ],

    /*
    | 生まれた仲間の立ち位置(道のマス)。生まれた順に使う。6人目以降を足すときは位置も足す。
    | 畑(1,2)の真正面にあたる(2,3)は、仲間のタップ範囲が畑を覆うので使わない
    */

    'companion_spots' => [[0, 3], [3, 2], [4, 3], [5, 3], [6, 3]],

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
