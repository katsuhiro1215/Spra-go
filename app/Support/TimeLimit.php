<?php

namespace App\Support;

use App\Models\Question;

/**
 * 1問の制限時間(秒)。級の基本の秒数に、問題の形の倍率をかける(docs/design/2026-10-15-stage-rules-design.md 6-1)。
 * 画面は、ここで決めた秒数を数えるだけ。
 */
class TimeLimit
{
    public static function seconds(string $difficulty, Question $question): int
    {
        $config = config('quiz.time_limit');
        $base = $config['seconds'][$difficulty] ?? 30;

        // スペルを並べる形(QuizVariants が variant を付ける)は、4択より時間がかかる
        $multiplier = $question->getAttribute('variant') !== null
            ? $config['spelling']
            : ($config['multiplier'][$question->type] ?? 1);

        return (int) round($base * $multiplier);
    }
}
