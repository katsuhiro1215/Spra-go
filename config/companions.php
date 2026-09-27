<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 仲間の一覧(docs/design/2026-09-27-spru-wave-b-design.md 3-5)
    |--------------------------------------------------------------------------
    |
    | 種をまいたとき、まだ生まれていない仲間から weight(出やすさ)の重みで1人選ぶ。
    | 特別な仲間を足すときは、絵(tools/spru-assets/crops.json の companions)と1行を足す。
    | 立ち位置は config/world.php の companion_spots。
    |
    */

    'list' => [
        'lumi' => ['name' => 'Lumi', 'trait' => '光・ひらめき', 'line' => 'ひらめいた！いっしょに学ぼう', 'weight' => 1],
        'momo' => ['name' => 'Momo', 'trait' => '花・やさしさ', 'line' => 'お花、きれいだね', 'weight' => 1],
        'kuru' => ['name' => 'Kuru', 'trait' => '木の実・知識', 'line' => 'ものしりになりたいな', 'weight' => 1],
        'piko' => ['name' => 'Piko', 'trait' => '葉・冒険', 'line' => '冒険に行こうよ！', 'weight' => 1],
        'ruru' => ['name' => 'Ruru', 'trait' => '水・知恵', 'line' => 'じっくり考えるのが好き', 'weight' => 1],
    ],

    // 種ができるまでのレベルアップの回数(ふつう → つぼみ → 花 → 種)
    'growth_steps' => 3,

    // 生まれるまでの水やりの回数(1日1回)
    'waterings_to_bloom' => 3,

    // 全員生まれた後の種から咲くもの(非売品の町のアイテム)
    'flower_result' => 'spru_flower',
    'flower_item' => ['name' => 'スプルの花', 'asset_key' => 'spru_flower'],

];
