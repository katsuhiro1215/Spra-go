<?php

/*
|--------------------------------------------------------------------------
| パンとやさいのずかん(docs/design/2026-10-05-bread-zukan-design.md)
|--------------------------------------------------------------------------
|
| 今日のおつかい3つをそろえた日に、まだ持っていない物から1つ贈る。表示の順は、この並び。
| 画面の絵は SPRU_ITEMS の `zukan_{キー}`(tools/spru-assets/crops.json)。
| 物を足すときは、ここに1行足して、絵を足す。
|
*/

return [

    'items' => [
        'fresh_bread_loaf' => ['name' => 'やきたてパン', 'english' => 'fresh bread', 'kind' => 'bread'],
        'shokupan' => ['name' => 'しょくパン', 'english' => 'sandwich bread', 'kind' => 'bread'],
        'baguette' => ['name' => 'バゲット', 'english' => 'baguette', 'kind' => 'bread'],
        'croissant' => ['name' => 'クロワッサン', 'english' => 'croissant', 'kind' => 'bread'],
        'melon_bread' => ['name' => 'メロンパン', 'english' => 'melon bread', 'kind' => 'bread'],
        'anpan' => ['name' => 'あんパン', 'english' => 'sweet bean bun', 'kind' => 'bread'],
        'curry_bread' => ['name' => 'カレーパン', 'english' => 'curry bread', 'kind' => 'bread'],
        'custard_bun' => ['name' => 'クリームパン', 'english' => 'custard bun', 'kind' => 'bread'],
        'sandwich' => ['name' => 'サンドイッチ', 'english' => 'sandwich', 'kind' => 'bread'],
        'fruit_danish' => ['name' => 'フルーツデニッシュ', 'english' => 'fruit danish', 'kind' => 'bread'],
        'wheat' => ['name' => '小麦のたば', 'english' => 'wheat', 'kind' => 'crop'],
        'flour' => ['name' => '小麦粉', 'english' => 'flour', 'kind' => 'crop'],
        'carrot' => ['name' => 'にんじん', 'english' => 'carrot', 'kind' => 'crop'],
        'potato' => ['name' => 'じゃがいも', 'english' => 'potato', 'kind' => 'crop'],
        'onion' => ['name' => '玉ねぎ', 'english' => 'onion', 'kind' => 'crop'],
    ],

];
