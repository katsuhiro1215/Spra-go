<?php

namespace App\Support;

/** 単語帳の決まり(docs/design/2026-10-07-word-book-design.md)。取り込み・API・出会いの記録 */
class Words
{
    /** 重要度(★の数)の既定。語のレベルで決まる */
    public static function defaultImportance(int $level): int
    {
        $tiers = config('words.importance_by_level');
        ksort($tiers);
        foreach ($tiers as $upTo => $importance) {
            if ($level <= $upTo) {
                return $importance;
            }
        }

        return (int) end($tiers);
    }

    /** 品詞の短い表示(名・動・形…)。「名詞・動詞」は「名・動」。知らない品詞は、そのまま */
    public static function posLabel(string $pos): string
    {
        $labels = config('words.pos_labels');

        return implode('・', array_map(fn (string $part) => $labels[trim($part)] ?? trim($part), explode('・', $pos)));
    }
}
