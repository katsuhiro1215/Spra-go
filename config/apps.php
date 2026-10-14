<?php

// Spra のアプリの一覧(docs/design/2026-10-14-multi-app-accounts-design.md 4-2)。
// アプリを足すときは、ここに1行足す。キーは X-Spra-App ヘッダーと user_apps.app に使う。
return [
    'apps' => [
        'go' => ['name' => 'Spra Go'],
        'tane' => ['name' => 'Tane'],
        'world' => ['name' => 'Spra World'],
    ],
];
