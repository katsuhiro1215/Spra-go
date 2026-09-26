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
    ],

    /*
    | 町のアイテムの絵として用意済みのキー。フロントの components/world/item-art.tsx と
    | 必ず一致させる(Ownerが絵の無いアイテムを登録できないようにするため)。
    */

    'asset_keys' => ['bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall'],

];
