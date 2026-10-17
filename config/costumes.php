<?php

/*
|--------------------------------------------------------------------------
| スプルのきせかえ(docs/design/2026-10-17-spru-costumes-design.md 2章)
|--------------------------------------------------------------------------
|
| ランのタネで買う。season の間(MM-DD〜MM-DD、両端を含む。年またぎも可)だけ交換所に並ぶ。買った物は、季節の外でもずっと着られる。
| 絵は frontend/public/spru/costumes/{key}.webp(tools/spru-assets/crops.json の costumes)。キーは画面の SPRU_COSTUMES と同じ。
|
*/

$halloween = ['from' => '10-01', 'until' => '10-31'];
$christmas = ['from' => '12-01', 'until' => '12-25'];

return [
    'items' => [
        ['key' => 'halloween-ghost', 'name' => 'おばけ', 'price' => 2000, 'season' => $halloween],
        ['key' => 'halloween-mummy', 'name' => 'ミイラ', 'price' => 2000, 'season' => $halloween],
        ['key' => 'halloween-bat', 'name' => 'コウモリ', 'price' => 2500, 'season' => $halloween],
        ['key' => 'halloween-witch', 'name' => 'かぼちゃのまじょ', 'price' => 3500, 'season' => $halloween],
        ['key' => 'halloween-vampire', 'name' => 'きゅうけつき', 'price' => 3500, 'season' => $halloween],
        ['key' => 'halloween-dress', 'name' => 'かぼちゃのドレス', 'price' => 5000, 'season' => $halloween],
        ['key' => 'christmas-snowman', 'name' => 'ゆきだるま', 'price' => 2000, 'season' => $christmas],
        ['key' => 'christmas-reindeer', 'name' => 'トナカイ', 'price' => 2500, 'season' => $christmas],
        ['key' => 'christmas-gift', 'name' => 'プレゼントのはこ', 'price' => 2500, 'season' => $christmas],
        ['key' => 'christmas-santa', 'name' => 'サンタ', 'price' => 3500, 'season' => $christmas],
        ['key' => 'christmas-tree', 'name' => 'クリスマスツリー', 'price' => 3500, 'season' => $christmas],
        ['key' => 'christmas-cape', 'name' => 'サンタのマント', 'price' => 5000, 'season' => $christmas],
    ],
];
