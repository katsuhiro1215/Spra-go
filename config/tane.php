<?php

// Tane(算数アプリ)との連携。Spra Go のアカウントでログイン・登録し、プロフィールごとの記録を預かる
// (docs/design/2026-10-21-tane-account-sync-request.md、company/spra/tane/docs/2026-10-21-account-sync-design.md)
return [
    // Tane の規約・プライバシーポリシーの更新が済むまでは off のまま。off の間は、トークンの発行と Tane からの登録が 403
    // (すでに発行ずみのトークンで呼ぶ記録の入口は動く)
    'login_enabled' => env('TANE_LOGIN_ENABLED', false),

    // Tane の画面の場所(CORS で許可する)。空なら許可しない
    'url' => env('TANE_URL'),

    // トークンの有効日数
    'token_days' => 90,

    // 保護者の確認(パスワードの入れ直し)が有効な分数
    'parent_confirm_minutes' => 15,

    // 1人のプロフィールが持てるステージの記録の件数(これを超える分は捨てる)
    'max_stage_records' => 200,

    // あそんだ日を何日前まで受け付けるか
    'play_days_window' => 14,
];
