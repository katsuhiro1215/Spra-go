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

];
