<?php

return [

    /*
    | 旅の行き先(docs/design/2026-09-27-spru-wave-f-design.md 3-1・3-2・4-2)。並び順がそのまま旅の順番(1本道)。
    | 次の国へ行くには、レベル・町のアイテム(items: 絵のキー => 名前。置いていてもバッグでもよい)・
    | 1つ前の国の condition=boss のおみやげがいる。おみやげのキーはそのまま絵のキー(asset_key)。
    | 2×2のおみやげは config/world.php の asset_footprints に書く。flag は public/flag/ のファイル名
    | (DBの国コードは大文字小文字が不揃いなため)。画面の art-keys.test.ts がおみやげの行の形を読むので、1行1つで書く
    */

    'destinations' => [
        [
            'key' => 'id',
            'name' => 'インドネシア',
            'country_code' => 'id',
            'flag' => 'id',
            'min_level' => 7,
            'items' => ['boat_small' => '小さな船'],
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
            'min_level' => 9,
            'items' => ['bicycle' => '自転車'],
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
            'min_level' => 11,
            'items' => ['boat_large' => '大きな船'],
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
            'min_level' => 13,
            'items' => ['castle' => 'お城'],
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
            'min_level' => 15,
            'items' => ['tower' => 'タワー'],
            'greeting' => ['text' => 'Bienvenue!', 'reading' => 'ビアンヴニュ'],
            'souvenirs' => [
                ['key' => 'eiffel', 'name' => 'エッフェル塔の置物', 'condition' => 'stage'],
                ['key' => 'mont_saint_michel', 'name' => 'モン・サン=ミッシェル', 'condition' => 'boss'],
            ],
        ],
    ],

];
