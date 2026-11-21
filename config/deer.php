<?php

// Spraと鹿。(奈良の鹿のゲーム)との連携。Spra Go のアカウントでログインし、面ごとの記録・ランキング・遊ばれた数を預かる
// (docs/design/2026-11-21-deer-account-request.md)
return [
    // Spraと鹿。の規約・プライバシーポリシーの更新が済むまでは off のまま。off の間は、トークンの発行と Spraと鹿。からの登録が 403
    'login_enabled' => env('DEER_LOGIN_ENABLED', false),

    // Spraと鹿。の画面の場所(CORS で許可する)。空なら許可しない
    'url' => env('DEER_URL'),

    // トークンの有効日数(Tane と同じ)
    'token_days' => 90,

    // ログインしなくても遊べる面: 各ワールドの この番号まで(1-1・1-2、2-1・2-2 …)
    'free_levels' => 2,

    // 遊ばれた数の集計を、何秒ためておくか
    'stats_cache_seconds' => 600,
];
