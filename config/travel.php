<?php

return [

    /*
    | 旅(docs/design/2026-09-28-travel-tickets-design.md 3章・4-1)。home ははじまりの国(最初から学べ、旅の行き先には入らない)。
    | destinations の並び順は、せかいの地図の島の順と学ぶタブの並び順に使う(行く順番は自由)。
    | まだの国へは、チケット(学べる国の初級のボスで1か国1枚)を1枚使って行く。transport は出発の場面の乗り物(ship/plane)。
    | おみやげのキーはそのまま絵のキー(asset_key)。2×2のおみやげは config/world.php の asset_footprints に書く。
    | flag は public/flag/ のファイル名(DBの国コードは大文字小文字が不揃いなため)。
    | 画面の art-keys.test.ts がおみやげの行の形を読むので、1行1つで書く
    */

    'home' => ['key' => 'jp', 'name' => '日本', 'country_code' => 'jp'],

    'destinations' => [
        [
            'key' => 'id',
            'name' => 'インドネシア',
            'country_code' => 'id',
            'flag' => 'id',
            'transport' => 'ship',
            'greeting' => ['text' => 'Selamat datang!', 'reading' => 'スラマット ダタン'],
            'souvenirs' => [
                ['key' => 'komodo', 'name' => 'コモドドラゴンの像', 'condition' => 'stage'],
                ['key' => 'borobudur', 'name' => 'ボロブドゥール寺院', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'kr',
            'name' => '韓国',
            'country_code' => 'kr',
            'flag' => 'kr',
            'transport' => 'ship',
            'greeting' => ['text' => '환영합니다!', 'reading' => 'ファニョンハムニダ'],
            'souvenirs' => [
                ['key' => 'dol_hareubang', 'name' => 'トルハルバン', 'condition' => 'stage'],
                ['key' => 'bulguksa', 'name' => '仏国寺', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'us',
            'name' => 'アメリカ',
            'country_code' => 'us',
            'flag' => 'us',
            'transport' => 'plane',
            'greeting' => ['text' => 'Welcome!', 'reading' => 'ウェルカム'],
            'souvenirs' => [
                ['key' => 'bison', 'name' => 'バイソンの像', 'condition' => 'stage'],
                ['key' => 'liberty', 'name' => '自由の女神', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'gb',
            'name' => 'イギリス',
            'country_code' => 'gb',
            'flag' => 'GB',
            'transport' => 'plane',
            'greeting' => ['text' => 'Hello!', 'reading' => 'ハロー'],
            'souvenirs' => [
                ['key' => 'phone_box', 'name' => '赤い電話ボックス', 'condition' => 'stage'],
                ['key' => 'stonehenge', 'name' => 'ストーンヘンジ', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'fr',
            'name' => 'フランス',
            'country_code' => 'fr',
            'flag' => 'fr',
            'transport' => 'plane',
            'greeting' => ['text' => 'Bienvenue!', 'reading' => 'ビアンヴニュ'],
            'souvenirs' => [
                ['key' => 'eiffel', 'name' => 'エッフェル塔の置物', 'condition' => 'stage'],
                ['key' => 'mont_saint_michel', 'name' => 'モン・サン=ミッシェル', 'condition' => 'boss'],
            ],
        ],
    ],

];
