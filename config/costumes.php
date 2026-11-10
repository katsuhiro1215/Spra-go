<?php

/*
|--------------------------------------------------------------------------
| スプルのきせかえ(docs/design/2026-10-17-spru-costumes-design.md 2章)
|--------------------------------------------------------------------------
|
| ランのタネで買う。season の間(MM-DD〜MM-DD、両端を含む。年またぎも可)だけ交換所に並ぶ。買った物は、季節の外でもずっと着られる。
| 絵は frontend/public/spru/costumes/{key}.webp(tools/spru-assets/crops.json の costumes)。キーは画面の SPRU_COSTUMES と同じ。
|
| currency を書かない物は run_seed(ランのタネ)扱い。swim_coin(スイムコイン)の物は明記する(2026-11-11)。
| season(毎年繰り返すMM-DD)と違い、window は一回限りの期間(YYYY-MM-DD〜YYYY-MM-DD)。
| docs/design/2026-10-17-spru-costumes-design.md 10章・docs/design/2026-11-10-spru-swim-design.md 参照。
|
*/

$halloween = ['from' => '10-01', 'until' => '10-31'];
$christmas = ['from' => '12-01', 'until' => '12-25'];
$swimDebut = ['from' => '2026-11-11', 'until' => '2026-11-25'];

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

        // スイムコイン交換所(2026-11-11〜2026-11-25)。価格は作り込みの多さで3段階
        ['key' => 'hero-knight', 'name' => 'きし', 'price' => 1500, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'hero-wizard', 'name' => 'まほうつかい', 'price' => 1500, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'hero-archer', 'name' => 'ゆみのせんし', 'price' => 1500, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'cool-biker', 'name' => 'ライダー', 'price' => 1500, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'hero-samurai', 'name' => 'さむらい', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'cool-ninja', 'name' => 'にんじゃ', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'cool-cowboy', 'name' => 'カウボーイ', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'kawaii-rain', 'name' => 'あまぐ', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'kawaii-sleep', 'name' => 'おやすみ', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'kawaii-swim', 'name' => 'うきわ', 'price' => 1200, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'cool-sunglasses', 'name' => 'サングラス', 'price' => 1000, 'currency' => 'swim_coin', 'window' => $swimDebut],
        ['key' => 'kawaii-heart', 'name' => 'なかよしハート', 'price' => 1000, 'currency' => 'swim_coin', 'window' => $swimDebut],
    ],
];
