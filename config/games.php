<?php

return [

    /*
    |--------------------------------------------------------------------------
    | スプルキャッチ(英単語のミニゲーム)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-09-29-spru-catch-design.md 3-3・6-1。
    | lanes は列の数(選択肢の数)、fall_ms は受け取る線まで落ちる時間、
    | max_label_width は選択肢の長さの上限(mb_strwidth。全角1文字が2)、reward は正解1問あたりのごほうび。
    |
    */

    'catch' => [
        'catalog' => ['released_on' => null, 'season' => null],
        'category' => '英語を学ぶ',
        'question_count' => 10,
        'review_max' => 6,
        'daily_rewarded_plays' => 3,
        'score' => ['correct' => 10, 'combo_bonus' => 5, 'combo_bonus_from' => 3],
        'difficulties' => [
            '初級' => ['lanes' => 2, 'fall_ms' => 8000, 'max_label_width' => 16, 'reward' => ['xp' => 3, 'point' => 3]],
            '中級' => ['lanes' => 3, 'fall_ms' => 6000, 'max_label_width' => 14, 'reward' => ['xp' => 4, 'point' => 3]],
            '上級' => ['lanes' => 4, 'fall_ms' => 4500, 'max_label_width' => 12, 'reward' => ['xp' => 5, 'point' => 3]],
        ],
        'messages' => [
            'locked' => 'アメリカかイギリスに着くと遊べるよ',
            'empty' => 'この難しさの問題はまだないよ',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | スプルキャッチ(こっき)(国旗のミニゲーム)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-10-05-flag-catch-design.md 2・5章。英語のスプルキャッチと同じ遊び方。
    | quiz は、難しさごとの問題の出どころ(国旗キャッチ専用のクイズの名前。FlagCatchPlanner が作る)。
    | 点数の決まり(score)は、英語の games.catch.score を共通に使う。選択肢の長さの上限(max_label_width)は持たない。
    |
    */

    'flag_catch' => [
        'catalog' => ['released_on' => null, 'season' => null],
        'question_count' => 10,
        'review_max' => 6,
        'daily_rewarded_plays' => 3,
        'difficulties' => [
            '初級' => ['lanes' => 2, 'fall_ms' => 8000, 'quiz' => '国旗キャッチ 初級', 'reward' => ['xp' => 3, 'point' => 3]],
            '中級' => ['lanes' => 3, 'fall_ms' => 6000, 'quiz' => '国旗キャッチ 中級', 'reward' => ['xp' => 4, 'point' => 3]],
            '上級' => ['lanes' => 4, 'fall_ms' => 4500, 'quiz' => '国旗キャッチ 上級', 'reward' => ['xp' => 5, 'point' => 3]],
        ],
        'messages' => [
            'empty' => 'この難しさの問題はまだないよ',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | うちゅう旅行(宇宙のミニゲーム)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-10-09-space-trip-design.md 2・3・6章。ロケットで進み、隕石をよけ、星を集めて、答えの門をくぐる。
    | 問題は、カテゴリー category(の子)のステージの問題を、難しさ(ステージの級)で選ぶ。点数の決まり(score)は英語と共通。
    | obstacle_rows は隕石の段の数、destinations は到着する星(正解を10問に換算した数の上限 => 星のキー)。
    |
    */

    'space_trip' => [
        'catalog' => ['released_on' => null, 'season' => null],
        'category' => '宇宙',
        'question_count' => 10,
        'review_max' => 6,
        'daily_rewarded_plays' => 3,
        'difficulties' => [
            '初級' => ['lanes' => 2, 'fall_ms' => 8000, 'obstacle_rows' => 2, 'reward' => ['xp' => 3, 'point' => 3]],
            '中級' => ['lanes' => 3, 'fall_ms' => 6000, 'obstacle_rows' => 3, 'reward' => ['xp' => 4, 'point' => 3]],
            '上級' => ['lanes' => 4, 'fall_ms' => 4500, 'obstacle_rows' => 4, 'reward' => ['xp' => 5, 'point' => 3]],
        ],
        'max_stars_per_question' => 3,
        'destinations' => [2 => 'moon', 4 => 'mars', 6 => 'jupiter', 8 => 'saturn', 9 => 'neptune', 10 => 'pluto'],
        'messages' => [
            'empty' => '宇宙の問題はじゅんびちゅうだよ',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | ミニゲームの小出し(docs/design/2026-10-09-minigame-rollout-design.md)
    |--------------------------------------------------------------------------
    |
    | 各ゲームの catalog: released_on(出す日 'YYYY-MM-DD'。null は最初から)、season(毎年の期間 ['from' => 'MM-DD', 'until' => 'MM-DD']。null は常設)。
    | new_days: 出す日から「NEW」を付ける日数。daily_rewarded_total: 全ゲームの合計で、1日にごほうびが出る回数。
    | featured_multiplier: 今週のゲームのごほうびの倍率(切り上げ)。
    |
    */

    'rollout' => [
        'new_days' => 14,
        'daily_rewarded_total' => 6,
        'featured_multiplier' => (float) env('GAMES_FEATURED_MULTIPLIER', 1.5), // テストでは週で変わらないよう 1 にする(phpunit.xml)
    ],

];
