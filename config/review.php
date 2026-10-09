<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 出題のくり返し(おさらい)
    |--------------------------------------------------------------------------
    |
    | docs/design/2026-09-29-spaced-review-design.md 4-2。
    | 段階 → 次に出るまでの日数。段階5で出す日以降に正解すると「覚えた」になり、もう出さない。
    |
    */

    'intervals' => [1 => 1, 2 => 3, 3 => 7, 4 => 14, 5 => 30],

    // 相棒の復習(1日1回)で出す最大の問題数
    'daily_size' => 10,

    // ボス以外のステージに足す、出す日が来た前の問題の最大数
    'stage_mix' => 2,

    /*
    | 出し方の変化(docs/design/2026-10-09-review-variety-design.md 2・3章)。
    | spelling: 前に答えたことのある英単語を、文字のタイルを並べる形にして出す。
    | 1ステージの最大数・単語の長さ(英字だけ)・まちがいの文字の数(レベル preschool_max_level 以下は preschool_extra_letters)
    */

    'variants' => [
        'spelling' => [
            'max_per_stage' => 2,
            'min_length' => 3,
            'max_length' => 8,
            'extra_letters' => 2,
            'preschool_extra_letters' => 1,
            'preschool_max_level' => 10,
        ],
    ],

    /*
    | 出す順番の優先(docs/design/2026-10-09-review-priority-design.md 4-1)。
    | daily: 毎日の復習の枠(残りは「いちばん遅れている問題」)。stage: ステージのおさらいの先頭の1問が探す順。
    | recent_wrong_days: まちがえてから何日までを「最近」とするか。weak_gap_days: 苦手の語を、最後に答えてから何日あけて出すか
    */

    'priority' => [
        'daily' => ['recent_wrong' => 3, 'weak' => 2, 'almost' => 2, 'now' => 2],
        'stage' => ['recent_wrong', 'weak', 'almost'],
        'recent_wrong_days' => 7,
        'weak_gap_days' => 3,
        'window_days' => 7, // 「今学んでいる所」を決める、直近の日数
    ],

];
