<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 宇宙ぼうけんマップ(docs/design/2026-10-10-space-adventure-map-design.md 2章)
    |--------------------------------------------------------------------------
    |
    | stops: 行き先の順番。前の星をクリアすると、次の星が開く(最初の星は最初から開いている)。
    | difficulty は、その星で遊ぶときの難しさ(games.space_trip の設定を使う)。note は、地図に出すひとこと。
    | clear_ratio: 正解の割合がこれ以上でクリア。star_ratios: 星の評価([割合, 星の数])。first_clear_bonus: はじめてクリアしたときだけのボーナス。
    |
    */

    'stops' => [
        ['key' => 'moon', 'name' => '月', 'difficulty' => '初級', 'color' => '#d9d6c8', 'note' => '地球のまわりを回る、たったひとつの大きな衛星だよ'],
        ['key' => 'mercury', 'name' => '水星', 'difficulty' => '初級', 'color' => '#9a9a9a', 'note' => '太陽にいちばん近い、小さな惑星だよ'],
        ['key' => 'venus', 'name' => '金星', 'difficulty' => '初級', 'color' => '#e8cf8a', 'note' => '厚い雲につつまれた、明るい惑星だよ'],
        ['key' => 'mars', 'name' => '火星', 'difficulty' => '中級', 'color' => '#c8553d', 'note' => '赤く見える、さびた大地の惑星だよ'],
        ['key' => 'jupiter', 'name' => '木星', 'difficulty' => '中級', 'color' => '#d8a05e', 'note' => '太陽系でいちばん大きい惑星だよ'],
        ['key' => 'saturn', 'name' => '土星', 'difficulty' => '中級', 'color' => '#e3c88a', 'note' => 'きれいな輪をもつ惑星だよ'],
        ['key' => 'uranus', 'name' => '天王星', 'difficulty' => '上級', 'color' => '#8fd3d8', 'note' => 'ほとんど横だおしで回る、青緑の惑星だよ'],
        ['key' => 'neptune', 'name' => '海王星', 'difficulty' => '上級', 'color' => '#4a6fd0', 'note' => '太陽からいちばん遠い、青い惑星だよ'],
        ['key' => 'pluto', 'name' => '冥王星', 'difficulty' => '上級', 'color' => '#b49a86', 'note' => '2006年から「準惑星」になった、遠くの星だよ'],
    ],

    'clear_ratio' => 0.6,

    // 星の評価: [正解の割合, 星の数]。割合の大きい順に、当てはまる最後のもの
    'star_ratios' => [[0.6, 1], [0.8, 2], [1.0, 3]],

    'first_clear_bonus' => ['xp' => 30, 'point' => 30],

];
